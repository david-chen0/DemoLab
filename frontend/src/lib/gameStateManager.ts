import { Table } from 'apache-arrow';
import type { RoundData, RoundState, DatasetName } from '../interfaces/interfaces';
import { Dataset } from '../interfaces/interfaces';
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
    datasetName: DatasetName,
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
   * @param tableIndexToStart - The row index of the table that the tick we'll process starts at(ex: indexToStart = 10 means we start processing at row index 10)
   * @param currentTick - The current tick that we are processing
   * @returns The index that the next tick starts at
   */
  private parsePlayerData(roundState: RoundState, tableIndexToStart: number, currentTick: number): number {
    if (!this.currentRoundData) {
      throw new Error("No round data available");
    }

    // Get the player data table from the tables map
    const playerData = this.currentRoundData.tables.get(Dataset.PLAYER_DATA);
    if (!playerData) {
      throw Error('No player data table found in roundData');
    }
    
    // Check if we have enough data to parse this tick
    let idx = tableIndexToStart;
    if (idx >= playerData.numRows) {
      throw Error(`Cannot parse tick: index ${idx} is beyond available player data (${playerData.numRows} rows)`);
    }

    const continuousTickParse = currentTick == roundState.tick + 1;

    while (idx < playerData.numRows) {
      const row = playerData.get(idx);
      if (row == null) {
        throw Error(`No row found for index ${idx}, likely an issue with the calling code.`);
      }

      if (row.tick != currentTick) { break } // Current row is on a later tick

      // Getting the player's PlayerData object
      const playerId = row.player_steamid.toString(); // Convert to string to match map key type
      const playerName = row.player_name;
      const player = roundState.playerMap.get(playerId);
      if (!player) {
        throw Error(`Could not find player corresponding to steam name ${playerName} and steam ID ${playerId}`);
      }

      // Only update if the player is alive and the tick is a continuous parse, as the player being dead in the previous tick means that their state
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

      idx += 1;
    }

    // Returning the first index corresponding to a tick larger than the current tick
    return idx;
  }

  // TODO: For now, this just increments the event data index so that everything else stays functional
  // Once the event parsing is added in, change these notes
  private parseEventData(roundState: RoundState, tableIndexToStart: number, currentTick: number): number {
    if (!this.currentRoundData) {
      throw new Error("No round data available");
    }

    // Get the player data table from the tables map
    const eventData = this.currentRoundData.tables.get(Dataset.EVENT_DATA);
    if (!eventData) {
        throw Error('No event data table found in roundData');
    }
    
    // Check if we have enough data to parse this tick
    let idx = tableIndexToStart;
    if (idx >= eventData.numRows) {
      throw Error(`Cannot parse tick: index ${idx} is beyond available event data (${eventData.numRows} rows)`);
    }
    
    // We need to handle event jumps differently from player jumps, as events that happen a long time ago could still last(ex: molotovs)
    const continuousTickParse = currentTick == roundState.tick + 1;
    console.log(`Continuous parse? ${continuousTickParse}`); // TODO: This is just here to so the compiler doesn't complain about continuousTickParse not being used yet, remove once not needed

    // TODO: Implement the event data parsing
    // For now, this will simply increment the idx so that everything else is functional
    while (idx < eventData.numRows) {
      const row = eventData.get(idx);
      if (row == null) {
        throw Error(`No row found for index ${idx}, likely an issue with the calling code.`);
      }

      if (row.tick != currentTick) { break } // Current row is on a later tick

      idx += 1;
    }

    // Returning the first index corresponding to a tick larger than the current tick
    return idx;
  }

  /**
   * Parses the data relating to the current tick and updates the data stored in the RoundState object in-place.
   *
   * Note that it is the caller's job to verify that there are ticks remaining and that the previously processed tick was not the last.
   * This method may error out if there is no data remaining to process.
   *
   * @param roundState - The RoundState that we'll update, which at input time is tracking the data at previous tick.
   * @param tickIndexMap - The map from the React ref that we are using to track the index of the row for each table. This will also be updated with the new row index.
   * @param currentTick - The tick that we are processing. We cannot just assume that it is the next tick after the current one in roundState, as we can jump around too.
   */
  parseTick(roundState: RoundState, tickIndexMap: Map<string, number>, currentTick: number) {
    // Parsing the player data for this tick and then updating the row index to be the index of the next row after this tick
    let playerTableIndex = tickIndexMap.get(Dataset.PLAYER_DATA);
    if (playerTableIndex == undefined) {
      console.error(`No index set for player table's rows, so unable to parse the tick.`);
      return;
    }
    playerTableIndex = this.parsePlayerData(roundState, playerTableIndex, currentTick);
    tickIndexMap.set(Dataset.PLAYER_DATA, playerTableIndex);

    // Parsing the event data for this tick and then updating the row index to be the index of the next row after this tick
    let eventTableIndex = tickIndexMap.get(Dataset.EVENT_DATA);
    if (eventTableIndex == undefined) {
      console.error(`No index set for event table's rows, so unable to parse the tick.`);
      return;
    }
    eventTableIndex = this.parseEventData(roundState, eventTableIndex, currentTick);
    tickIndexMap.set(Dataset.EVENT_DATA, eventTableIndex);

    // Setting the roundState's tick at the end, as we use the info of previous tick in our logic
    roundState.tick = currentTick;
  }
}
