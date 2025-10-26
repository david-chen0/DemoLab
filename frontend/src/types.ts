/**
 * Contains the player metadata
 */
export type PlayerMetadata = {
  playerName: string; // Name of the player, ex: d0nk
  playerId: number; // Player's steamId, ex: 76561198386265483
  playerTeamNumber: number; // Team number in this game, 1-indexed, ex: 1
};

/**
 * Backend player metadata structure (snake_case)
 */
export type BackendPlayerMetadata = {
  name: string;
  id: number;
  team: number;
};

/**
 * Contains the game metadata
 */
export type GameMetadata = {
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
export type BackendGameMetadata = {
  demo_id: string;
  players: BackendPlayerMetadata[];
  map: string;
  num_rounds: number;
  match_timestamp: string;
  server_type: string;
};
