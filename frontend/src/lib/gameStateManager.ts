import type { RoundData, RoundState, PlayerData } from '../interfaces/interfaces';
import { FIELD_MAP } from '../config/fieldMappings';

// Creates a blank playerdata
// TODO: is this the best place to put this?
export function createBlankPlayer(): PlayerData {
    return {
        x: 0,
        y: 0,
        z: 0,
        pitch: 0,
        yaw: 0,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        hp: 0,
        is_alive: true,
        is_defusing: false,
        is_in_bombsite: null,
        is_in_buy_zone: null,
        is_scoped: false,
        is_walking: false,
        is_ducking: false,
        team_name: null,
        cash: 0,
        equipment_value_this_round: 0,
        cash_spent_this_round: 0,
        armor_value: 0,
        has_helmet: false,
        has_defuse_kit: false,
        active_weapon_name: "",
        active_weapon_ammo: 0,
        active_weapon_reserve: 0,
        flash_duration: 0,
        flash_max_alpha: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
    }
}

// TODO: Update the notes on this and related methods
// returns the index of the next place in the table to process(unless we find another way to do this)
export function parseTick(roundState: RoundState, indexToStart: number, roundData: RoundData): number {
    const tickData = roundData.tickData; // Data on all the ticks in this round
    let idx = indexToStart; // NOTE: ON CALLER TO VERIFY THAT THERE ARE TICKS LEFT/LAST TICK WASNT LAST
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
