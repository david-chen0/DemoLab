from enum import Enum
from typing import List

class DemoParserEvents(Enum):
    """
    Enum containing all available demo parser events.
    
    Ordered alphabetically for now, can figure out a better way to organize these later
    
    THIS MIGHT BE A POSSIBLE WAY TO JUST GET ALL THE EVENT NAMES:
    TODO: TRY THIS
    event_names = parser.list_game_events()
    """
    
    BEGIN_NEW_MATCH = "begin_new_match"   # Start of the match
    ROUND_START = "round_start"         # Round started
    ROUND_END = "round_end"
    

    @classmethod
    def get_all(cls) -> List['DemoParserEvents']:
        """Return all available properties."""
        return list(cls)

    @classmethod
    def to_strings(cls, props: List['DemoParserEvents']) -> List[str]:
        """Convert list of enum values to list of string values for demoparser2."""
        return [prop.value for prop in props]
