import type { RoundData, RoundState } from '../interfaces/interfaces';
import { FIELD_MAP } from '../config/fieldMappings';

/**
 * Parses the data relating to the current tick and updates the PlayerData's stored in the RoundState in-place.
 * 
 * Note that it is the caller's job to verify that there are ticks remaining and that the previously processed tick was not the last.
 * This method may error out if there is no data remaining to process.
 * 
 * @param roundState - The RoundState that we'll update, which at input time is tracking the data at previous tick.
 * @param indexToStart - The row index of the table that the tick we'll process starts at(ex: indexToStart = 10 means we start processing at row index 10)
 * @param roundData - The data for the entire round
 * @returns The index that the next tick starts at
 */
export function parseTick(roundState: RoundState, indexToStart: number, roundData: RoundData): number {
    const tickData = roundData.tickData; // Data on all the ticks in this round
    let idx = indexToStart;
    const currentTickNum = tickData.get(idx)!.tick;
    roundState.tick = currentTickNum;

    while (idx < tickData.numRows) {
        const row = tickData.get(idx);
        if (row == null) {
            throw Error(`No row found for index ${idx}, likely an issue with the calling code.`)
        }

        if (row.tick != currentTickNum) { break } // Current row is on next tick

        // Getting the player's PlayerData object
        const playerId = row.player_steamid.toString(); // Convert to string to match map key type
        const player = roundState.playerMap.get(playerId);
        if (!player) {
            throw Error(`Could not find player corresponding to steam ID ${playerId}`);
        }

        // We only update if the player was previously alive, as the player being dead previously means that their state
        // can not change during this round
        if (player.is_alive) {
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

    // Returning the first index corresponding to the next tick
    return idx;
}
