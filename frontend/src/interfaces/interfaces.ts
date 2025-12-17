import { Table } from 'apache-arrow';

// =============================================================================
// Data Streaming Interfaces/types
// =============================================================================

export type DatasetName = string; // Name of the dataset
export type ChunkIndex = number; // Index of the chunk, which needs to be synchronized across datasets since we chunk by tick

/**
 * Aggregated data for a single chunk. Each dataset contributes exactly one Arrow table for the chunk.
 */
export type ChunkData = {
  [datasetName: string]: Table;
};

/**
 * Callback invoked once a chunk is ready, which is when all datasets have contributed their data for that chunk.
 */
export type ChunkReadyCallback = (
  chunkIndex: ChunkIndex,
  data: ChunkData
) => void;

/**
 * Represents a chunk for a table, which is how we organize the data from the backend to the frontend.
 */
export type StreamChunk = {
  datasetName: string;
  windowIndex: number; 
  chunkTable: Table;
}

// =============================================================================
// (Meta)Data Interfaces/Types
// =============================================================================

/**
 * Contains the player metadata
 */
export interface PlayerMetadata {
  playerName: string; // Name of the player, ex: d0nk
  playerId: string; // Player's steamId, ex: "76561198386265483" (string to preserve 64-bit precision)
  playerTeamNumber: number; // Team number in this game, 1-indexed, ex: 1
};

/**
 * Contains the round metadata
 */
export interface RoundMetadata {
  roundStart: number; // Tick when the round started
  roundEnd: number; // Tick when the round ended
};

/**
 * Backend round metadata structure (snake_case)
 */
export interface BackendRoundMetadata {
  round_start: number;
  round_end: number;
};

/**
 * Backend player metadata structure (snake_case)
 */
export interface BackendPlayerMetadata {
  name: string;
  id: string; // This needs to be a string, as the number can be too large and out of Typescript's 64-bit integer range
  team: number;
};

/**
 * Contains the game metadata
 */
export interface GameMetadata {
  demoId: string; // Hash value used to ID the demo
  playerInfo: Array<PlayerMetadata>; // List of player metadata
  map: string; // Name of the map, ex: de_mirage
  numRounds: number; // Number of rounds played, ex: 24
  matchTimestamp: string; // Timestamp that the match was played, represented as a string(can be converted to Date), ex: 2025-10-26T14:32:18.123Z
  serverType: string; // Type of the server that the match was played on, ex: FACEIT
  roundMetadata: Record<number, RoundMetadata>; // Map from round number (1-indexed) to round metadata
};

/**
 * Backend game metadata structure (snake_case)
 */
export interface BackendGameMetadata {
  demo_id: string;
  players: BackendPlayerMetadata[];
  map: string;
  num_rounds: number;
  match_timestamp: string;
  server_type: string;
  round_metadata: Record<number, BackendRoundMetadata>; // Map from round number (1-indexed) to round metadata
};

export interface PlayerData {
  // Player position and movement properties
  x: number; // x coordinate(left to right) of the player
  y: number; // y coordinate(forward to backward) of the player
  z: number; // z coordinate(up to down) of the player
  pitch: number; // Player's pitch(looking down or up)
  yaw: number; // Player's yaw(looking left or right)
  velocityX: number; // Player's velocity in x-direction
  velocityY: number; // Player's velocity in y-direction
  velocityZ: number; // Player's velocity in z-direction

  // Player state properties
  hp: number; // Player's hp(0-100)
  is_alive: boolean; // Boolean indicating if player is alive
  is_defusing: boolean; // Boolean indicating if player is defusing
  is_in_bombsite: boolean | null; // Boolean indicating if player is in bombsite, not always provided
  is_in_buy_zone: boolean | null; // Boolean indicating if player is in buy zone, not always provided
  is_scoped: boolean; // Boolean indicating if player is scoped
  is_walking: boolean; // Boolean indicating if player is walking
  is_ducking: boolean; // Boolean indicating if player is ducking

  // Player identity
  team_name: "TERRORIST" | "CT" | null // Current side the player is on TODO THIS MIGHT NOT BE NEEDED/USEFUL

  // Economy & Equipment Properties
  cash: number; // Player's current cash amount
  equipment_value_this_round: number; // Player's equipment value this round
  cash_spent_this_round: number; // Cash spent by player this round
  armor_value: number; // Player's armor value
  has_helmet: boolean; // Boolean indicating if player has a helmet
  has_defuse_kit: boolean; // Boolean indicating if player has a defuse kit

  // Weapon & Equipment Properties
  active_weapon_name: string; // Player's current active weapon
  active_weapon_ammo: number; // Amount of ammo in active weapon
  active_weapon_reserve: number; // Amount of reserve ammo in active weapon
  flash_duration: number; // Amount of time player is flashed
  flash_max_alpha: number; // TODO: Not fully sure of this one, I think like how white the player was?

  // Game State Properties
  kills: number; // Number of kills player has
  deaths: number; // Number of deaths player has
  assists: number; // Number of assists player has
}

// this one is meant to be mutable and track the state of the round
export interface RoundState {
  playerMap: Map<string, PlayerData>; // Map from player's steamId (as string) to the corresponding PlayerData
  tick: number; // The current tick that the round is on
}

export interface RoundData {
  roundNum: number; // The current round's number
  tables: Map<DatasetName, Table> // Map from table's name to the currently stored table
}

// =============================================================================
// Rendering Interfaces/Types
// =============================================================================

export interface GameRendererProps {
  gameMetadata: GameMetadata; // Metadata of the game
  roundState: RoundState; // Current state of the round
  renderVersion: number; // Version counter to trigger player model re-renders, as we are editing roundState in-place, which won't trigger a re-render
}

/**
 * Map coordinate bounds configuration
 */
export interface MapCoordinateBounds {
  bottomLeft: {
    x: number; // Bottom-left X coordinate in game units
    y: number; // Bottom-left Y coordinate in game units
  };
  topRight: {
    x: number; // Top-right X coordinate in game units
    y: number; // Top-right Y coordinate in game units
  };
}

/**
 * Map configuration for coordinate mapping and rendering
 */
export interface MapConfig {
  mapName: string; // Name of the map (e.g., "de_dust2")
  coordinateBounds: MapCoordinateBounds; // Game coordinate bounds
}
