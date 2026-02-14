import { tableFromIPC } from 'apache-arrow';
import type {
  GameMetadata,
  PlayerMetadata,
  BackendGameMetadata,
  BackendPlayerMetadata,
  RoundMetadata,
  BackendRoundMetadata,
  StreamChunk,
  DatasetName,
} from '../interfaces/interfaces';

// API endpoint prefixes
export const ENDPOINT_PREFIX = import.meta.env.VITE_API_URL;
export const DEMO_COACH_ENDPOINT_PREFIX = "demo_coach";
export const DEMO_INGESTOR_ENDPOINT_PREFIX = "demo_ingestor";

// Constants
const STREAM_BOUNDARY = "--arrowboundary123--";

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
 * Maps backend round metadata (snake_case) to frontend format (camelCase)
 */
const mapRoundMetadata = (backendRoundMetadata: Record<number, BackendRoundMetadata>): Record<number, RoundMetadata> => {
  const roundMetadata: Record<number, RoundMetadata> = {};
  
  for (const [roundNum, backendRound] of Object.entries(backendRoundMetadata)) {
    roundMetadata[parseInt(roundNum)] = {
      roundStart: backendRound.round_start,
      roundEnd: backendRound.round_end,
    };
  }
  
  return roundMetadata;
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
    roundMetadata: mapRoundMetadata(backendMetadata.round_metadata),
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
 * Hits the backend stream_demo_datasets API, which provides a byte queue containing Arrow tables for each dataset, ordered by chunks based on ticks.
 * See backend for info on API usage, as it won't be maintained here.
 * 
 * General gist of the workflow:
 * One request gives a multipart stream. We read the response body as a stream and split it by multipart boundaries
 * For each part:
 *  Read the headers
 *  Extract the arrow bytes
 *  Decode the Arrow IPC
 *  Route the data by dataset and chunk index
 * 
 * @param datasetNames - List containing the names of the datasets to fetch for
 * @param demoId - ID of the demo
 * @param onChunk - Method to be called when a chunk corresponding to a dataset is received
 * @param roundNumber - Optional round number to fetch the data for. If not specified, entire demo is retrieved
 */
export const streamData = async (
  datasetNames: DatasetName[],
  demoId: string,
  onChunk: (chunk: StreamChunk) => void,
  roundNumber?: number,
): Promise<void> => {
  // TODO: this method will be quite large, figure out how to split it after we get it working first

  const indexOf = (
    buffer: Uint8Array,
    pattern: Uint8Array,
    start: number
  ): number => {
    outer: for (let i = start; i <= buffer.length - pattern.length; i++) {
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) continue outer;
      }
      return i;
    }
    return -1;
  };

  let endpoint = `${ENDPOINT_PREFIX}/${DEMO_COACH_ENDPOINT_PREFIX}/stream_demo_datasets`;

  // Adding query params
  const params = new URLSearchParams();
  params.append("demo_id", demoId);
  datasetNames.forEach(datasetName => {
    params.append("dataset_names", datasetName);
  });
  if (roundNumber != null) {
    params.append("round_num", roundNumber.toString());
  }
  endpoint += `?${params.toString()}`;

  // Getting the chunks continually
  const response = await fetch(endpoint, { method: 'GET' });
  if (!response.ok || !response.body) {
    // Something failed in the backend
    throw new Error(`Backend error (${response.status}): ${response.text()}`);
  }

  // Reader and buffer to receive the HTTP stream and bytes
  const reader = response.body.getReader();
  let buffer = new Uint8Array(0); // Empty to start

  while (true) {
    // Reads from browser's internal byte queue(from TCP socket) when any bytes are available
    // Value could be anything, not necessarily just the things we send
    // done is true only when the stream is closed
    const { value, done } = await reader.read();
    
    // Append new bytes to buffer if we have any
    if (value) {
      // TODO: Repeatedly allocating is slow(O(n^2)) over time, get it working first then change how it works later on
      const tmp = new Uint8Array(buffer.length + value.length);
      tmp.set(buffer);
      tmp.set(value, buffer.length); // Appending to the back of previous buffer
      buffer = tmp;
    }

    // Process the multiple parts
    const partBoundaryBytes = new TextEncoder().encode(STREAM_BOUNDARY);
    const endBoundaryBytes = new TextEncoder().encode(STREAM_BOUNDARY);
    let processedBytes = 0;
    
    while (true) {
      // Look for the start of a part boundary
      const partStart = indexOf(buffer, partBoundaryBytes, processedBytes);
      if (partStart === -1) break; // No more complete parts in buffer
      
      // Look for the next boundary (either another part or the end)
      const nextPartStart = indexOf(buffer, partBoundaryBytes, partStart + partBoundaryBytes.length);
      const endBoundaryStart = indexOf(buffer, endBoundaryBytes, partStart + partBoundaryBytes.length);
      
      let partEnd = -1;
      let isLastPart = false;
      
      if (endBoundaryStart !== -1 && (nextPartStart === -1 || endBoundaryStart < nextPartStart)) {
        // Found the end boundary
        partEnd = endBoundaryStart;
        isLastPart = true;
      } else if (nextPartStart !== -1) {
        // Found the next part boundary
        partEnd = nextPartStart;
      } else {
        // No complete part found, wait for more data
        break;
      }

      // Extract the part content (between boundaries)
      const partContent = buffer.slice(partStart + partBoundaryBytes.length, partEnd);
      
      // Find headers separator
      const separator = new TextEncoder().encode("\r\n\r\n");
      const headerEnd = indexOf(partContent, separator, 0);
      if (headerEnd === -1) {
        // Incomplete headers, wait for more data
        break;
      }

      const headerBytes = partContent.slice(0, headerEnd);
      const body = partContent.slice(headerEnd + separator.length);

      // Parse headers
      const headersText = new TextDecoder().decode(headerBytes);
      const lines = headersText.split("\r\n").map(l => l.trim()).filter(l => l.length > 0);
      const headers: Record<string, string> = {};
      for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).toLowerCase();
        const value = line.slice(idx + 1).trim();
        headers[key] = value;
      }

      // Only process if we have the required headers
      if (headers["x-dataset-id"] && headers["x-window-index"] !== undefined) {
        const datasetName = headers["x-dataset-id"] as DatasetName;
        const windowIndex = Number(headers["x-window-index"]);
        
        try {
          const table = tableFromIPC(body.buffer);
          onChunk({ datasetName, windowIndex, chunkTable: table });
        } catch (error) {
          console.error("Error parsing Arrow data:", error);
        }
      }

      // Update processed bytes to the end of this part
      processedBytes = partEnd;
      
      if (isLastPart) {
        // We've reached the end boundary, we're done
        console.log("Stream completed - found end boundary");
        return;
      }
    }
    
    // Remove processed bytes from buffer to prevent it from growing too large
    if (processedBytes > 0) {
      buffer = buffer.slice(processedBytes);
    }
    
    if (done) {
      // Stream is done and we've processed all available data
      console.log("Stream completed - connection closed");
      break;
    }
  }
}
