import { Table } from 'apache-arrow';

/**
 * Contains the player metadata
 */
export interface PlayerMetadata {
  playerName: string; // Name of the player, ex: d0nk
  playerId: number; // Player's steamId, ex: 76561198386265483
  playerTeamNumber: number; // Team number in this game, 1-indexed, ex: 1
};

/**
 * Backend player metadata structure (snake_case)
 */
export interface BackendPlayerMetadata {
  name: string;
  id: number;
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
};

// todo: figure out the things we need, ex hp, armor, weapons, etc
export interface PlayerData {
  metadata: PlayerMetadata; // Metadata on the player
  x: number; // x coordinate of the player
  y: number; // y coordinate of the player
  z: number; // z coordinate of the player
  team: "T" | "CT" | null // Current side the player is on TODO THIS MIGHT NOT BE NEEDED/USEFUL
}

export interface RoundData {
  game: GameMetadata; // Metadata of the game that this round is part of
  roundNum: number; // The current round's number
  tickData: Table; // Table of all data for the round TODO DO WE WANT TO DO IT THIS WAY, ESP IF WE WANT TO STREAM LATER ON?
  currentTick: number; // Current tick that the game is on
}
