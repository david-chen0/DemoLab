import { Table, tableFromIPC } from 'apache-arrow';
import type {
  GameMetadata,
  PlayerMetadata,
  BackendGameMetadata,
  BackendPlayerMetadata
} from '../interfaces/interfaces';

// API endpoint prefixes
export const ENDPOINT_PREFIX = "http://localhost:8000";
export const DEMO_COACH_ENDPOINT_PREFIX = "demo_coach";
export const DEMO_INGESTOR_ENDPOINT_PREFIX = "demo_ingestor";

/**
 * Maps backend player metadata (snake_case) to frontend format (camelCase)
 */
const mapPlayerMetadata = (backendPlayer: BackendPlayerMetadata): PlayerMetadata => {
  return {
    playerName: backendPlayer.name,
    playerId: backendPlayer.id,
    playerTeamNumber: backendPlayer.team,
  };
};

/**
 * Maps backend game metadata (snake_case) to frontend format (camelCase)
 */
const mapGameMetadata = (backendMetadata: BackendGameMetadata): GameMetadata => {
  return {
    demoId: backendMetadata.demo_id,
    playerInfo: backendMetadata.players.map(mapPlayerMetadata),
    map: backendMetadata.map,
    numRounds: backendMetadata.num_rounds,
    matchTimestamp: backendMetadata.match_timestamp,
    serverType: backendMetadata.server_type,
  };
};

/**
 * Fetches demo metadata from the backend and maps it to frontend format
 */
export const getDemoMetadata = async (demoId: string): Promise<GameMetadata> => {
  const endpoint = `${ENDPOINT_PREFIX}/${DEMO_COACH_ENDPOINT_PREFIX}/get_metadata?demo_id=${demoId}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  // Map backend metadata (snake_case) to frontend format (camelCase)
  const mappedMetadata = mapGameMetadata(result.metadata as BackendGameMetadata);
  return mappedMetadata;
};

/**
 * Uploads a demo file to the backend for ingestion
 */
export const uploadDemoFile = async (file: File): Promise<{ message: string; demoId: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${ENDPOINT_PREFIX}/${DEMO_INGESTOR_ENDPOINT_PREFIX}/ingest_demo`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    message: result.message,
    demoId: result.demoId,
  };
};

/**
 * Fetches demo data from the backend as an Apache Arrow table
 */
export const getDemoData = async (demoId?: string, roundNumber?: number): Promise<Table> => {
  let endpoint = `${ENDPOINT_PREFIX}/${DEMO_COACH_ENDPOINT_PREFIX}/get_demo_data`;
  if (demoId != null) {
    endpoint += `?demo_id=${encodeURIComponent(demoId)}`;
    
    // Round number can only be provided if demoId is provided
    if (roundNumber != null) {
      endpoint += `&round_num=${roundNumber}`;
    }
  }

  // Fetch the binary stream containing the demo data from the backend
  const response = await fetch(endpoint, {
    method: 'GET',
  });
  if (!response.ok) {
    // Something failed in the backend
    throw new Error(`Backend error (${response.status}): ${response.text()}`);
  }

  // Converting the binary stream into an Arrow table
  const arrayBuffer = await response.arrayBuffer();
  const table = tableFromIPC(arrayBuffer);

  return table;

  // Iterate over the result later with something like this    
  // for (let i = 0; i < table.length; i++) {
  //   const row = table.get(i);
  // }
};
