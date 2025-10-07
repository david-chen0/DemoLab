from demoparser2 import DemoParser
from ..config.demo_parser_props import DemoParserProps


class DemoIngestorManager:
    # Using centralized configuration for demo parser properties
    # See config/demo_parser_props.py for all available properties and combinations
    wanted_props = DemoParserProps.to_strings([
        DemoParserProps.X
    ])

    def __init__(self): return

    def ingest_demo(self, filepath: str):
        """
        this will do the actual logic of ingesting the demo and storing it

        HOW DO WE WANT TO STORE THE OUTPUT THOUGH? WILL IT BE A LIST OF DELTAS
        PER TICK GROUP?
        """
        parser = DemoParser(filepath)

        # SAMPLE CODE, COULD BE HELPFUL
        # https://github.com/LaihoE/demoparser/blob/a344aae17a14a54aa15aab6fa45ce30c1985382e/examples/efficiently_parse_multi_events_and_ticks/index.py
        # # Filter out events before the match start
        # filtered_events = [(event_name, df[df['tick'] >= match_start_tick]) for event_name, df in all_events]

        # wanted_props = ["equipment_value_this_round", "cash_spent_this_round", "is_alive", "team_num", "player_name", "score", "player_steamid"]
        # tick_values = set()
        # for _, df in filtered_events:
        #     tick_values.update(df['tick'].unique())

        # Fetching all the ticks from the game, represented as a Pandas DataFrame
        tick_values = set()
        all_ticks = parser.parse_ticks(
            wanted_props=self.wanted_props,
            ticks=tick_values
        )

        # Storing the tick information by tick value
        all_ticks_map = {}
        for tick in all_ticks.itertuples():
            if tick.tick not in all_ticks_map:
                all_ticks_map[tick.tick] = [tick]
            else:
                all_ticks_map[tick.tick].append(tick)

        return
