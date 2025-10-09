from demoparser2 import DemoParser
from ..config.demo_parser_events import DemoParserEvents
from ..config.demo_parser_props import DemoParserProps


class DemoIngestorManager:
    # Using centralized configuration for demo parser properties
    # See config/demo_parser_props.py for all available properties and combinations
    wanted_props = DemoParserProps.to_strings([
        DemoParserProps.X,
        DemoParserProps.Y,
        DemoParserProps.Z,
        DemoParserProps.PITCH,
        DemoParserProps.VELOCITY_X,
        DemoParserProps.VELOCITY_Y,
        DemoParserProps.VELOCITY_Z,
        DemoParserProps.HP,
        DemoParserProps.IS_DEFUSING,
        DemoParserProps.IS_IN_BOMBSITE, # todo Do we need this one if we're going to parse the map?
        DemoParserProps.IS_IN_BUY_ZONE,
        DemoParserProps.IS_SCOPED,
        DemoParserProps.IS_WALKING,
        DemoParserProps.IS_DUCKING,
        DemoParserProps.PLAYER_NAME, # todo do we need both this and steamid? or either?
        DemoParserProps.PLAYER_STEAMID,
        DemoParserProps.TEAM_NAME,
        DemoParserProps.CASH,
        DemoParserProps.EQUIPMENT_VALUE,
        DemoParserProps.HAS_DEFUSE_KIT,
        DemoParserProps.ARMOR_VALUE,
        DemoParserProps.HAS_HELMET,
        DemoParserProps.HAS_DEFUSE_KIT,
        DemoParserProps.ACTIVE_WEAPON_NAME,
        DemoParserProps.ACTIVE_WEAPON_AMMO,
        DemoParserProps.ACTIVE_WEAPON_RESERVE,
        DemoParserProps.FLASH_DURATION,
        DemoParserProps.TICK,
        DemoParserProps.SCORE,
        DemoParserProps.KILLS,
        DemoParserProps.DEATHS,
        DemoParserProps.ASSISTS,
        DemoParserProps.GAME_PHASE
    ])
    
    parser: DemoParser

    def __init__(self, filepath: str):
        """
        Class is not meant to be a singleton, as it should be instantiated per file
        """
        self.parser = DemoParser(filepath)
    
    
    def _get_match_start_tick(self) -> int:
        """
        Returns the tick that the match started.
        Useful for filtering for all ticks after match start
        """
        begin_match_event = self.parser.parse_event(DemoParserEvents.BEGIN_NEW_MATCH.value)
        return begin_match_event['tick'].iloc[0] if begin_match_event is not None else 0

    def ingest_demo(self):
        """
        this will do the actual logic of ingesting the demo and storing it

        HOW DO WE WANT TO STORE THE OUTPUT THOUGH? WILL IT BE A LIST OF DELTAS
        PER TICK GROUP?
        """
        # lets add a temp thing here that lists all events, and if its not in the list of
        # game events that we have we output it at the end
        # todo: remove this after we've established all the possible events
        all_game_events = self.parser.list_game_events()
        all_events_in_config = DemoParserEvents.get_all()
        for event in all_game_events:
            if event not in all_events_in_config:
                print(f"Found a new event that is not in our config: {event}")
        
        
        # Filter out events before the match start
        match_start_tick = self._get_match_start_tick()
        all_events = self.parser.parse_events(["all"])
        filtered_events = [(event_name, df[df['tick'] >= match_start_tick]) for event_name, df in all_events]

        # Getting all the tick values in the game that we want
        tick_values = set()
        for _, df in filtered_events:
            tick_values.update(df['tick'].unique())
            
        # Getting all the information we want(from wanted_props) at each tick
        all_ticks = self.parser.parse_ticks(
            wanted_props=self.wanted_props,
            ticks=list(tick_values)
        )

        # Storing the tick information by tick value
        all_ticks_map = {}
        for tick in all_ticks.itertuples():
            if tick.tick not in all_ticks_map:
                all_ticks_map[tick.tick] = [tick]
            else:
                all_ticks_map[tick.tick].append(tick)
        print(all_ticks_map)
