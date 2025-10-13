import pandas as pd
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
        # todo Do we need this one if we're going to parse the map?
        DemoParserProps.IS_IN_BOMBSITE,
        DemoParserProps.IS_IN_BUY_ZONE,
        DemoParserProps.IS_SCOPED,
        DemoParserProps.IS_WALKING,
        DemoParserProps.IS_DUCKING,
        DemoParserProps.PLAYER_NAME,  # todo do we need both this and steamid? or either?
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

    def _get_ticks_for_event(self, events: list[str]) -> list[int]:
        """
        Returns list of ticks for the specified event, ascending order.
        """
        event_ticks = []
        for __, event_df in self.parser.parse_events(
            events
        ):
            event_ticks.append(event_df[DemoParserProps.TICK.value].iloc[0])
        return event_ticks

    def _get_match_start_tick(self) -> int:
        """
        Returns the tick that the match started.
        Useful for filtering for all ticks after match start
        """
        begin_new_match_events = self._get_ticks_for_event(
            [DemoParserEvents.BEGIN_NEW_MATCH.value])
        return begin_new_match_events[0] if len(begin_new_match_events) else 0

    # def _get_match_end_tick(self) -> int:
    #     """
    #     Returns the tick that the match ended.
    #     Useful for filtering for all ticks before match end
    #     """
    #     match_end_events = self._get_ticks_for_event([DemoParserEvents.])

    def ingest_demo(self):
        """
        This method will ingest and process the raw demo file. The output of this method TBD, NEED TO FILL THIS IN ONCE DECIDED

        The current workflow is as follows:
            All events are retrieved, which gives us a list of all ticks that had an event recorded in the game
            Tick for match start is retrieved, which we use to filter for all events that happened after match start
            We query all ticks from the set of ticks after match start, which gives us all the events that happened per tick

            EVERYTHING ABOVE HAS BEEN IMPLEMENTED
            BELOW IS PLANNED, CHANGE IT IF THE IMPLEMENTATION CHANGES
            BATCHING BY TICKS WILL BE HANDLED BY FRONTEND, NOT BACKEND, AS WE WANT TO PROVIDE AS PRECISE INFO AS POSSIBLE
            TO THE MODEL

            Certain fields are converted and normalized to have a clean and easily readable form
            The ticks are partitioned by round, as each round's data is independent of each other
            All fields that we care about are recorded and each of those fields per tick are stored in a Parquet file
                The Parquet file is partitioned by round
                We choose Parquet since there is a large amount of data and the file only needs to be constructed once, but read multiple times
                Can easily convert Parquet files to JSON for human readability(if required)
                Compression will be done with TODO: figure out what compression(ex: snappy, ZSTD, BROTLI)

        TODO: figure out how we want to store the results. do we want to store it locally for now? or upload to a blob store
        also how we want the model to be able to understand that its time to train it? do we want to keep a persistent queue
        so that the model can schedule workers? or just keep an api that does the same thing open

        DO WE WANT TO PARALLELIZE BY ROUND? SINCE THIS IS JUST EXTRACTING THE DATA, WE CAN PROLLY
        JUST PARALLELIZE BY ROUND AND THEN COMBINE IT ALL AT THE END
        we'll do it sequentially first and then can parallelize later on if sequentially takes too long
        """
        # TODO: This is just temporary for printing out the entire DFs
        # Specifies to not truncate by column width
        pd.set_option('display.max_columns', None)
        pd.set_option('display.max_colwidth', None)

        # TODO: This is a temporary mechanic to make sure we get all the possible events
        # Once our list of events is exhaustive, remove this section
        all_game_events = self.parser.list_game_events()
        for event in all_game_events:
            if event not in DemoParserEvents.get_all():
                print(f"Found a new event that is not in our config: {event}")

        # Filter out events before the match start
        match_start_tick = self._get_match_start_tick()
        all_events = self.parser.parse_events(DemoParserProps.get_all())
        filtered_events = [(event_name, df[df[DemoParserProps.TICK.value]
                            >= match_start_tick]) for event_name, df in all_events]
        print(f"Match start tick: {match_start_tick}")

        # Getting all the tick values in the game that we want
        tick_values = set()
        for _, df in filtered_events:
            tick_values.update(df[DemoParserProps.TICK.value].unique())

        # Getting all the information we want(from wanted_props) at each tick
        all_ticks_df = self.parser.parse_ticks(
            wanted_props=self.wanted_props,
            ticks=list(tick_values)
        ).sort_values(by=DemoParserProps.TICK.value)
        print(f"Dataframe fields: {all_ticks_df.columns.tolist()}")
        print(f"Number of elements in DF: {str(all_ticks_df.size)}")
        print(f"First two element of DF: {all_ticks_df.head(10)}")
        # print(f"Last element of DF: {all_ticks_df.tail()}")

        # # Storing the tick information by tick value
        # all_ticks_map = {}
        # for tick in all_ticks_df.itertuples():
        #     if tick.tick not in all_ticks_map:
        #         all_ticks_map[tick.tick] = [tick]
        #     else:
        #         all_ticks_map[tick.tick].append(tick)
        # # print(all_ticks_map)

        # Normalize the fields

        # Separate the ticks by round
        # Each round is defined by a (start_tick, end_tick) tuple, where the end tick is equal to the start tick of next round
        # Start is defined as when the players spawn in, not when the players are able to move
        # TODO: CHECK TO MAKE SURE THIS IS THE CORRECT ONE, IT'S POSSIBLE THAT ROUND_START SHOULD BE USED???
        # round_prestart_ticks = self.parser.parse_events(
        #     [DemoParserEvents.ROUND_PRESTART.value])
        round_prestart_ticks = self._get_ticks_for_event(
            [DemoParserEvents.ROUND_PRESTART.value])
        print(f"Round prestart ticks: {round_prestart_ticks}")
        # rounds_by_ticks =
