from enum import Enum, auto
from typing import List


class DemoParserEvents(Enum):
    """
    Enum containing all available demo parser events.

    Ordered alphabetically for now, can figure out a better way to organize these later

    Documentation for all events: https://cs2.poggu.me/dumped-data/game-events/

    TODO: Need a way to annotate what info each event encodes(ex: all events return the tick and the event name,
    bomb_planted also gives player who planted and site)
    """

    @staticmethod
    def _generate_next_value_(name: str, start: int, count: int, last_values: list) -> str:
        """
        Auto converts the enum's values to the lowercase version
        """
        return name.lower()

    # Announcing end of warmup, halftime, end of match, etc
    ANNOUNCE_PHASE_END = auto()    # End of announce phase
    BEGIN_NEW_MATCH = auto()    # Start of match
    BOMB_BEGINDEFUSE = auto()    # Start of bomb defuse
    BOMB_BEGINPLANT = auto()    # Start of bomb plant
    BOMB_DEFUSED = auto()    # Bomb was defused
    BOMB_DROPPED = auto()    # Bomb was dropped
    BOMB_EXPLODED = auto()    # Bomb exploded
    BOMB_PICKUP = auto()    # Bomb was picked up
    BOMB_PLANTED = auto()    # Bomb was planted
    BUYTIME_ENDED = auto()    # Buytime period ended
    CHAT_MESSAGE = auto()    # Chat message was sent
    CS_INTERMISSION = auto()    # TODO: don't know this
    CS_PRE_RESTART = auto()    # TODO: don't know this
    CS_ROUND_FINAL_BEEP = auto()    # Sound to indicate round finished
    CS_ROUND_START_BEEP = auto()    # Sound to indicate round started
    CS_WIN_PANEL_MATCH = auto()    # Final panel shown at the end of the game
    DECOY_DETONATE = auto()    # Decoy blew up
    DECOY_STARTED = auto()    # Decoy started making noise
    ENTITY_KILLED = auto()    # TODO: don't know this, i think this refers to non-player entities like chickens
    FLASHBANG_DETONATE = auto()    # Flashbang popped
    GRENADE_THROWN = auto()    # Grenade was thrown
    HEGRENADE_DETONATE = auto()    # HE grenade blew up
    HLTV_CHASE = auto()    # TODO: don't know this
    HLTV_FIXED = auto()    # TODO: don't know this
    HLTV_VERSIONINFO = auto()    # TODO: don't know this
    INFERNO_EXPIRE = auto()    # Molly ran out
    INFERNO_STARTBURN = auto()    # Molly started burning
    ITEM_EQUIP = auto()    # Item has been equipped
    ITEM_PICKUP = auto()    # Item has been picked up
    PLAYER_BLIND = auto()    # Player has been blinded
    PLAYER_CONNECT_FULL = auto()    # All players have connected
    PLAYER_DEATH = auto()    # Player has died
    PLAYER_DISCONNECT = auto()    # Player has disconnected
    PLAYER_FOOTSTEP = auto()    # Player made a footstep
    PLAYER_GIVEN_C4 = auto()    # Player was given C4
    PLAYER_HURT = auto()    # Player was hurt
    PLAYER_JUMP = auto()    # Player jumped
    PLAYER_PING = auto()    # Player pinged
    PLAYER_PING_STOP = auto()    # Player ping went away
    PLAYER_SOUND = auto()    # Player made a sound
    PLAYER_SPAWN = auto()    # Player spawned
    PLAYER_TEAM = auto()    # TODO: don't know this
    ROUND_ANNOUNCE_FINAL = auto()    # Announcement for final round of the game
    # Announcement for final round of the half
    ROUND_ANNOUNCE_LAST_ROUND_HALF = auto()
    ROUND_ANNOUNCE_MATCH_POINT = auto()    # Announcement for match point
    ROUND_ANNOUNCE_MATCH_START = auto()    # Announcement for start of match
    ROUND_END = auto()    # Round ended
    ROUND_END_UPLOAD_STATS = auto()    # TODO: don't know this
    ROUND_FREEZE_END = auto()    # Round freeze ended
    ROUND_OFFICIALLY_ENDED = auto()    # Round ended
    ROUND_POSTSTART = auto()    # TODO: don't know this
    ROUND_PRESTART = auto()    # TODO: don't know this
    ROUND_START = auto()    # Round started
    ROUND_TIME_WARNING = auto()    # Time warning on the time left in a round
    SERVER_CVAR = auto()    # TODO: don't know this
    SMOKEGRENADE_DETONATE = auto()    # Smoke grenade plumed
    SMOKEGRENADE_EXPIRED = auto()    # Smoke grenade faded away
    VOTE_CAST = auto()    # Vote was casted
    WEAPON_FIRE = auto()    # Player fired weapon
    WEAPON_RELOAD = auto()    # Player reloaded weapon
    WEAPON_ZOOM = auto()    # Player zoomed weapon

    @classmethod
    def get_all(cls) -> List[str]:
        """Return all available properties."""
        return DemoParserEvents.to_strings(list(cls))

    @classmethod
    def to_strings(cls, props: List['DemoParserEvents']) -> List[str]:
        """Convert list of enum values to list of string values for demoparser2."""
        return [prop.value for prop in props]
