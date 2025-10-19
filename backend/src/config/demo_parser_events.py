from enum import Enum
from typing import List


class DemoParserEvents(Enum):
    """
    Enum containing all available demo parser events.

    Ordered alphabetically for now, can figure out a better way to organize these later

    Documentation for all events: https://cs2.poggu.me/dumped-data/game-events/

    TODO: Need a way to annotate what info each event encodes(ex: all events return the tick and the event name,
    bomb_planted also gives player who planted and site)
    """

    # Announcing end of warmup, halftime, end of match, etc
    ANNOUNCE_PHASE_END = "announce_phase_end"
    BEGIN_NEW_MATCH = "begin_new_match"    # Start of match
    BOMB_BEGINDEFUSE = "bomb_begindefuse"  # Start of bomb defuse
    BOMB_BEGINPLANT = "bomb_beginplant"    # Start of bomb plant
    BOMB_DEFUSED = "bomb_defused"    # Bomb was defused
    BOMB_DROPPED = "bomb_dropped"    # Bomb was dropped
    BOMB_EXPLODED = "bomb_exploded"  # Bomb exploded
    BOMB_PICKUP = "bomb_pickup"   # Bomb was picked up
    BOMB_PLANTED = "bomb_planted"    # Bomb was planted
    BUYTIME_ENDED = "buytime_ended"   # Buytime period ended
    CHAT_MESSAGE = "chat_message"   # Chat message was sent
    CS_PRE_RESTART = "cs_pre_restart"    # TODO: don't know this
    CS_ROUND_FINAL_BEEP = "cs_round_final_beep"    # Sound to indicate round finished
    CS_ROUND_START_BEEP = "cs_round_start_beep"    # Sound to indicate round started
    # Final panel shown at the end of the game
    CS_WIN_PANEL_MATCH = "cs_win_panel_match"
    DECOY_DETONATE = "decoy_detonate"    # Decoy blew up
    DECOY_STARTED = "decoy_started"     # Decoy started making noise
    FLASHBANG_DETONATE = "flashbang_detonate"     # Flashbang popped
    HEGRENADE_DETONATE = "hegrenade_detonate"     # HE grenade blew up
    HLTV_CHASE = "hltv_chase"   # TODO: don't know this
    HLTV_FIXED = "hltv_fixed"   # TODO: don't know this
    HLTV_VERSIONINFO = "hltv_versioninfo"   # TODO: don't know this
    INFERNO_EXPIRE = "inferno_expire"    # Molly ran out
    INFERNO_STARTBURN = "inferno_startburn"   # Molly started burning
    ITEM_EQUIP = "item_equip"    # Item has been equipped
    ITEM_PICKUP = "item_pickup"   # Item has been picked up
    PLAYER_BLIND = "player_blind"   # Player has been blinded
    PLAYER_DEATH = "player_death"   # Player has died
    PLAYER_DISCONNECT = "player_disconnect"    # Player has disconnected
    PLAYER_FOOTSTEP = "player_footstep"    # Player made a footstep
    PLAYER_HURT = "player_hurt"   # Player was hurt
    PLAYER_JUMP = "player_jump"   # Player jumped
    PLAYER_SPAWN = "player_spawn"   # Player spawned
    PLAYER_TEAM = "player_team"   # TODO: don't know this
    # Announcement for final round of the game
    ROUND_ANNOUNCE_FINAL = "round_announce_final"
    # Announcement for final round of the half
    ROUND_ANNOUNCE_LAST_ROUND_HALF = "round_announce_last_round_half"
    # Announcement for match point
    ROUND_ANNOUNCE_MATCH_POINT = "round_announce_match_point"
    # Announcement for start of match
    ROUND_ANNOUNCE_MATCH_START = "round_announce_match_start"
    ROUND_END = "round_end"     # Round ended
    ROUND_FREEZE_END = "round_freeze_end"   # Round freeze ended
    ROUND_OFFICIALLY_ENDED = "round_officially_ended"   # Round ended
    ROUND_POSTSTART = "round_poststart"    # TODO: don't know this
    ROUND_PRESTART = "round_prestart"    # TODO: don't know this
    # Time warning on the time left in a round
    ROUND_TIME_WARNING = "round_time_warning"
    SERVER_CVAR = "server_cvar"   # TODO: don't know this
    SMOKEGRENADE_DETONATE = "smokegrenade_detonate"    # Smoke grenade plumed
    SMOKEGRENADE_EXPIRED = "smokegrenade_expired"   # Smoke grenade faded away
    WEAPON_FIRE = "weapon_fire"   # Player fired weapon
    WEAPON_RELOAD = "weapon_reload"   # Player reloaded weapon
    WEAPON_ZOOM = "weapon_zoom"   # Player zoomed weapon

    @classmethod
    def get_all(cls) -> List[str]:
        """Return all available properties."""
        return DemoParserEvents.to_strings(list(cls))

    @classmethod
    def to_strings(cls, props: List['DemoParserEvents']) -> List[str]:
        """Convert list of enum values to list of string values for demoparser2."""
        return [prop.value for prop in props]
