import { Table } from 'apache-arrow';
import type { RoundData, RoundState } from '../interfaces/interfaces';
import { FIELD_MAP } from '../config/fieldMappings';

// this class will be responsible for getting the data and for parsing the data too
export class GameStateManager {
  public currentRoundData: RoundData | null = null;

  /**
   * Changes to the specified round, which clears all previous data
   */
  changeRound(roundNum: number) {
    this.currentRoundData = {
      roundNum,
      tables: new Map(),
    };
  }

  appendChunk(
    datasetName: string,
    tableChunk: Table,
  ) {
    if (!this.currentRoundData) {
      throw new Error("No round selected so far");
    }

    const prevTable = this.currentRoundData.tables.get(datasetName);
    if (!prevTable) { // No data for this table in this round yet
      this.currentRoundData.tables.set(datasetName, tableChunk);
    } else {
      const newTable = prevTable.concat(tableChunk);
      this.currentRoundData.tables.set(datasetName, newTable);
    }
  }

  /**
   * Parses the data relating to the current tick and updates the PlayerData's stored in the RoundState in-place.
   *
   * Note that it is the caller's job to verify that there are ticks remaining and that the previously processed tick was not the last.
   * This method may error out if there is no data remaining to process.
   *
   * @param roundState - The RoundState that we'll update, which at input time is tracking the data at previous tick.
   * @param indexToStart - The row index of the table that the tick we'll process starts at(ex: indexToStart = 10 means we start processing at row index 10)
   * @returns The index that the next tick starts at
   */
  parseTick(roundState: RoundState, indexToStart: number): number {
    if (!this.currentRoundData) {
      throw new Error("No round data available");
    }

    // Get the player data table from the tables map
    const playerData = this.currentRoundData.tables.get('player_data');
    if (!playerData) {
        throw Error('No player_data table found in roundData');
    }
    
    let idx = indexToStart;
    
    // Check if we have enough data to parse this tick
    if (idx >= playerData.numRows) {
        throw Error(`Cannot parse tick: index ${idx} is beyond available data (${playerData.numRows} rows)`);
    }
    
    const currentTickNum = playerData.get(idx)!.tick;
    
    // Indicates whether we are parsing a continuous tick
    // If we are not(ex: jumping to a specific tick), then we need some special logic to avoid assumptions
    // that are made by continuous parses
    const continuousTickParse = currentTickNum == roundState.tick + 1;

    while (idx < playerData.numRows) {
        const row = playerData.get(idx);
        if (row == null) {
            throw Error(`No row found for index ${idx}, likely an issue with the calling code.`)
        }

        if (row.tick != currentTickNum) { break } // Current row is on next tick

        // Getting the player's PlayerData object
        const playerId = row.player_steamid.toString(); // Convert to string to match map key type
        const playerName = row.player_name;
        const player = roundState.playerMap.get(playerId);
        if (!player) {
            throw Error(`Could not find player corresponding to steam name ${playerName} and steam ID ${playerId}`);
        }

        // We only update if the player was previously alive, as the player being dead previously means that their state
        // can not change during this round
        if (!continuousTickParse || player.is_alive) {
            // Updating the player object in place
            // This is REQUIRED over creating a new PlayerData object, as creating new ones would cause a lot of memory usage and garbage collection issues
            for (const tableKey in FIELD_MAP) {
                const playerDataKey = FIELD_MAP[tableKey];
                const newValue = row[tableKey];
                if (newValue !== undefined) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (player as any)[playerDataKey] = newValue;
                }
            }
        }
        
        // Update game state for relevant events(ex: nade thrown)
        // TODO: Backend is currently not passing this information in yet, will need to add that in later on. For now, we just set an empty game state
        // That can probably come in a different method/handler, as this one mainly handles player logic

        idx += 1;
    }

    // Setting the roundState's tick at the end, as we use the info of previous tick in our logic
    roundState.tick = currentTickNum;

    // Returning the first index corresponding to the next tick
    return idx;
  }
}
