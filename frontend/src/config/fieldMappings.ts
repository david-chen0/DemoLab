import type { PlayerData } from '../interfaces/interfaces';

/**
 * Maps from table field key to PlayerData property key
 * Used to map backend data fields to frontend PlayerData interface
 */
export const FIELD_MAP: Record<string, keyof PlayerData> = {
    X: "x",
    Y: "y",
    Z: "z",
    pitch: "pitch",
    yaw: "yaw",
    velocity_X: "velocityX",
    velocity_Y: "velocityY",
    velocity_Z: "velocityZ",
    hp: "hp",
    is_alive: "is_alive",
    is_defusing: "is_defusing",
    is_in_bombsite: "is_in_bombsite",
    is_in_buy_zone: "is_in_buy_zone",
    is_scoped: "is_scoped",
    is_walking: "is_walking",
    is_ducking: "is_ducking",
    team_name: "team_name",
    cash: "cash",
    equipment_value_this_round: "equipment_value_this_round",
    cash_spent_this_round: "cash_spent_this_round",
    armor_value: "armor_value",
    has_helmet: "has_helmet",
    has_defuse_kit: "has_defuse_kit",
    active_weapon_name: "active_weapon_name",
    active_weapon_ammo: "active_weapon_ammo",
    active_weapon_reserve: "active_weapon_reserve",
    flash_duration: "flash_duration",
    flash_max_alpha: "flash_max_alpha",
    kills: "kills",
    deaths: "deaths",
    assists: "assists",
};
