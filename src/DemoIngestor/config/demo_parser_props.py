from enum import Enum
from typing import List

"""
Demo Parser Properties Configuration

This module contains all available properties that can be passed to the demoparser2
parse_ticks() method as wanted_props. Properties are organized as enum values
that callers can select individually.

Reference: https://github.com/LaihoE/demoparser/blob/main/README.md
Note that neither this list or the list in the README above are guaranteed to be representative of all the properties
Need to figure out where this all the properties are being fetched from

Usage Examples:
    # Use individual properties
    props = [DemoParserProps.X, DemoParserProps.Y, DemoParserProps.HP]
    
    # Get string values for demoparser2
    prop_names = [prop.value for prop in props]
    
    # Use with categories
    position_props = DemoParserProps.get_category('position')
    basic_props = DemoParserProps.get_basic()
"""


class DemoParserProps(Enum):
    """
    Enum containing all available demo parser properties.
    Each property can be used individually or combined with others.
    """

    # Player Position & Movement Properties
    X = "X"                           # X coordinate
    Y = "Y"                           # Y coordinate
    Z = "Z"                           # Z coordinate
    PITCH = "pitch"                   # View pitch angle
    YAW = "yaw"                       # View yaw angle
    VELOCITY_X = "velocity_X"         # X velocity component
    VELOCITY_Y = "velocity_Y"         # Y velocity component
    VELOCITY_Z = "velocity_Z"         # Z velocity component

    # Player State & Health Properties
    HP = "hp"                         # Health points
    IS_ALIVE = "is_alive"             # Whether player is alive
    IS_BOT = "is_bot"                 # Whether player is a bot
    IS_CONNECTED = "is_connected"     # Whether player is connected
    IS_DEFUSING = "is_defusing"       # Whether player is defusing
    IS_IN_BOMBSITE = "is_in_bombsite"  # Whether player is in bombsite
    IS_IN_BUY_ZONE = "is_in_buy_zone"  # Whether player is in buy zone
    IS_SCOPED = "is_scoped"           # Whether player is scoped
    IS_WALKING = "is_walking"         # Whether player is walking
    IS_DUCKING = "is_ducking"         # Whether player is ducking

    # Player Identity & Team Properties
    PLAYER_NAME = "player_name"       # Player name
    PLAYER_STEAMID = "player_steamid"  # Player Steam ID
    TEAM_NAME = "team_name"           # Team name
    # Team number (2 = Terrorist, 3 = Counter-Terrorist)
    TEAM_NUM = "team_num"
    TEAM_CLAN_NAME = "team_clan_name"  # Team clan name

    # Economy & Equipment Properties
    CASH = "cash"                                         # Current money
    EQUIPMENT_VALUE = "equipment_value"                   # Total equipment value
    # Equipment value for current round
    EQUIPMENT_VALUE_THIS_ROUND = "equipment_value_this_round"
    CASH_SPENT_THIS_ROUND = "cash_spent_this_round"       # Money spent this round
    ARMOR_VALUE = "armor_value"       # Armor value
    HAS_HELMET = "has_helmet"         # Whether player has helmet
    HAS_DEFUSE_KIT = "has_defuse_kit"  # Whether player has defuse kit

    # Weapons & Equipment Properties
    ACTIVE_WEAPON_NAME = "active_weapon_name"         # Currently active weapon
    ACTIVE_WEAPON_AMMO = "active_weapon_ammo"         # Ammo in active weapon
    ACTIVE_WEAPON_RESERVE = "active_weapon_reserve"   # Reserve ammo for active weapon
    FLASH_DURATION = "flash_duration"                 # Flash effect duration
    FLASH_MAX_ALPHA = "flash_max_alpha"               # Maximum flash alpha value

    # Game State Properties
    TICK = "tick"                     # Current game tick
    SECONDS = "seconds"               # Time in seconds
    SCORE = "score"                   # Player score
    KILLS = "kills"                   # Number of kills
    DEATHS = "deaths"                 # Number of deaths
    ASSISTS = "assists"               # Number of assists
    MVPS = "mvps"                     # Number of MVP awards

    # Round & Match State Properties
    ROUND_START_MONEY = "round_start_money"   # Money at round start
    IS_FREEZE_PERIOD = "is_freeze_period"     # Whether in freeze period
    IS_WARMUP_PERIOD = "is_warmup_period"     # Whether in warmup period
    GAME_PHASE = "game_phase"                 # Current game phase

    @classmethod
    def get_category(cls, category: str) -> List['DemoParserProps']:
        """
        Get all properties from a specific category.

        Args:
            category: Category name ('position', 'player_state', 'identity', 
                     'economy', 'weapons', 'game_state', 'round_state')

        Returns:
            List of DemoParserProps enum values for the category.
        """
        categories = {
            'position': [
                cls.X, cls.Y, cls.Z, cls.PITCH, cls.YAW,
                cls.VELOCITY_X, cls.VELOCITY_Y, cls.VELOCITY_Z
            ],
            'player_state': [
                cls.HP, cls.ARMOR_VALUE, cls.IS_ALIVE, cls.IS_BOT, cls.IS_CONNECTED,
                cls.IS_DEFUSING, cls.IS_IN_BOMBSITE, cls.IS_IN_BUY_ZONE,
                cls.IS_SCOPED, cls.IS_WALKING, cls.IS_DUCKING
            ],
            'identity': [
                cls.PLAYER_NAME, cls.PLAYER_STEAMID, cls.TEAM_NAME,
                cls.TEAM_NUM, cls.TEAM_CLAN_NAME
            ],
            'economy': [
                cls.CASH, cls.EQUIPMENT_VALUE, cls.EQUIPMENT_VALUE_THIS_ROUND,
                cls.CASH_SPENT_THIS_ROUND, cls.HAS_DEFUSE_KIT, cls.HAS_HELMET
            ],
            'weapons': [
                cls.ACTIVE_WEAPON_NAME, cls.ACTIVE_WEAPON_AMMO, cls.ACTIVE_WEAPON_RESERVE,
                cls.FLASH_DURATION, cls.FLASH_MAX_ALPHA
            ],
            'game_state': [
                cls.TICK, cls.SECONDS, cls.SCORE, cls.KILLS,
                cls.DEATHS, cls.ASSISTS, cls.MVPS
            ],
            'round_state': [
                cls.ROUND_START_MONEY, cls.IS_FREEZE_PERIOD,
                cls.IS_WARMUP_PERIOD, cls.GAME_PHASE
            ]
        }

        if category not in categories:
            raise ValueError(
                f"Invalid category '{category}'. Valid categories: {list(categories.keys())}")

        return categories[category]

    @classmethod
    def get_basic(cls) -> List['DemoParserProps']:
        """Example list of basic demo props"""
        return [
            cls.TICK, cls.SECONDS, cls.PLAYER_NAME, cls.PLAYER_STEAMID, cls.TEAM_NUM,
            cls.X, cls.Y, cls.Z, cls.HP, cls.IS_ALIVE, cls.SCORE, cls.KILLS, cls.DEATHS
        ]

    @classmethod
    def get_all(cls) -> List['DemoParserProps']:
        """Return all available properties."""
        return list(cls)

    @classmethod
    def to_strings(cls, props: List['DemoParserProps']) -> List[str]:
        """Convert list of enum values to list of string values for demoparser2."""
        return [prop.value for prop in props]


# Backward compatibility - maintain original constants as lists of strings
POSITION_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('position'))
PLAYER_STATE_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('player_state'))
IDENTITY_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('identity'))
ECONOMY_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('economy'))
WEAPON_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('weapons'))
GAME_STATE_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('game_state'))
ROUND_STATE_PROPS = DemoParserProps.to_strings(
    DemoParserProps.get_category('round_state'))
ALL_PROPS = DemoParserProps.to_strings(DemoParserProps.get_all())
BASIC_PROPS = DemoParserProps.to_strings(DemoParserProps.get_basic())
