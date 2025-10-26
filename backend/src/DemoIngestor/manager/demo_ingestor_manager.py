import datetime
import os
import pandas as pd
from typing import Optional
from demoparser2 import DemoParser
from ...config.demo_parser_events import DemoParserEvents
from ...config.demo_parser_props import DemoParserProps
from ...util.backoff_wrapper import BackoffWrapper
from ...util.demo_file_store import DemoFileStore


class DemoIngestorManager:
    """
    This class handles all the business logic for demo ingestion.
    """

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

    def __init__(self): return

    def _get_ticks_for_event(self, parser: DemoParser, events: list[str]) -> dict[str, list[int]]:
        """
        Returns a dict mapping from the event name to the ticks where that even happened, in ascending order.
        """
        event_ticks_map = {}
        for event_name, event_df in BackoffWrapper.with_backoff_expect_result(parser.parse_events, events):
            event_ticks_map[event_name] = event_df[DemoParserProps.TICK.value].tolist(
            )
        return event_ticks_map

    def _get_match_start_tick(self, parser: DemoParser) -> int:
        """
        Returns the tick that the match started.
        Useful for filtering for all ticks after match start
        """
        # Assigns the value of the query to begin_new_match_events, which then checks if the list corresponding
        # to the key both exists in the dict and is non-empty
        if (
            begin_new_match_events := self._get_ticks_for_event(
                parser,
                [DemoParserEvents.BEGIN_NEW_MATCH.value]
            ).get(DemoParserEvents.BEGIN_NEW_MATCH.value)
        ):
            return begin_new_match_events[0]
        return 0
    
    def _get_match_metadata(self, hash_val: str, filepath: str, parser: DemoParser, num_rounds: int) -> dict:
        """
        Returns the match metadata stored as a dict so that it can later be stored in JSON format.
        
        The following metadata is returned:
        demo_id(str)
        player_info(dict)
            player_name(str)
            player_id(int)
            player_team_number(int, 1-indexed)
        map(str, ex: de_mirage)
        num_rounds(int)
        match_timestamp(str)
        server_type(str, ex: FACEIT)
        """
        metadata = {}
        metadata['demo_id'] = hash_val
        
        # Parsing the header
        header = parser.parse_header()
        metadata['map'] = header['map_name']
        metadata['server_type'] = header['server_name'] # TODO: VERIFY EXPECTED OUTCOME FOR COMP, PREMIER, AND FACEIT
        
        # Parsing player info
        metadata['players'] = []
        player_info = parser.parse_player_info()
        team_number_map = {} # Some demos have weird team numbers(ex: 4-indexed), so we'll map it over to be 1-indexed
        for index, row in player_info.iterrows():
            team_num = row['team_number']
            if team_num in team_number_map:
                team_number = team_number_map[team_num]
            else:
                team_number = len(team_number_map)
                team_number_map[team_num] = team_number
            
            metadata['players'].append({
                'id': row['steamid'],
                'name': row['name'],
                'team': team_number,
            })
            
        # Extra metadata
        metadata['num_rounds'] = num_rounds
        # Gets the time that the file was created, not stored
        metadata['match_timestamp'] = datetime.datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
        
        return metadata

    def ingest_demo(self, filepath: str, hash_value: Optional[str] = None):
        """
        This method will ingest and process the raw demo file. The output of this method TBD, NEED TO FILL THIS IN ONCE DECIDED

        The current workflow is as follows:
            All events are retrieved, which gives us a list of all ticks that had an event recorded in the game
            Tick for match start is retrieved, which we use to filter for all events that happened after match start
            We query all ticks from the set of ticks after match start, which gives us all the events that happened per tick

            Certain fields are converted and normalized to have a clean and easily readable form
            The ticks are partitioned by round, as each round's data is independent of each other
            The partitioned ticks are then stored in separate Parquet files under the same game's directory, which is named after the game's hash value
        """
        # Parser for the demo file that we are ingesting
        parser = DemoParser(filepath)

        # Getting the hash of the file, which is where we'll store it under later
        if hash_value is None:
            hash_value = DemoFileStore.get_file_hash(filepath)

        # TODO: This is just temporary for printing out the entire DFs
        # Specifies to not truncate by column width
        pd.set_option('display.max_columns', None)
        pd.set_option('display.max_colwidth', None)

        # TODO: This is a temporary mechanic to make sure we get all the possible events
        # Once our list of events is exhaustive, remove this section
        all_game_events = BackoffWrapper.with_backoff_expect_result(
            parser.list_game_events
        )
        for event in all_game_events:
            if event not in DemoParserEvents.get_all():
                print(f"Found a new event that is not in our config: {event}")

        # Filter out events before the match start
        match_start_tick = self._get_match_start_tick(parser)
        all_events = BackoffWrapper.with_backoff_expect_result(
            parser.parse_events, DemoParserProps.get_all()
        )
        filtered_events = [(event_name, df[df[DemoParserProps.TICK.value]
                            >= match_start_tick]) for event_name, df in all_events]
        print(f"Match start tick: {match_start_tick}")

        # Getting all the tick values in the game that we want
        tick_values = set()
        for _, df in filtered_events:
            tick_values.update(df[DemoParserProps.TICK.value].unique())

        # Getting all the information we want(from wanted_props) at each tick
        all_ticks_df = BackoffWrapper.with_backoff_expect_result(
            parser.parse_ticks,
            wanted_props=self.wanted_props,
            ticks=list(tick_values),
        ).sort_values(by=DemoParserProps.TICK.value)
        print(f"Dataframe fields: {all_ticks_df.columns.tolist()}")
        print(f"Number of elements in DF: {str(all_ticks_df.size)}")
        print(f"First two element of DF: {all_ticks_df.head(10)}")

        # Separate the ticks by round
        # Each round is defined by a (start_tick, end_tick) tuple, where the end tick is equal to the start tick of next round
        # Start is defined as when the players spawn in, not when the players are able to move
        # TODO: need to figure out a sanity check for "dummy rounds" like knife round, warmup(non-valve servers mark these as a round), etc
        # ex: Faceit's first three rounds aren't actually rounds, first round is warmup, second is knife, third is warmup while deciding side
        round_start_and_end_ticks = self._get_ticks_for_event(
            parser,
            [
                DemoParserEvents.ROUND_START.value,
                DemoParserEvents.ROUND_END.value,
            ]
        )
        round_start_ticks = round_start_and_end_ticks[DemoParserEvents.ROUND_START.value]
        round_end_ticks = round_start_and_end_ticks[DemoParserEvents.ROUND_END.value]
        rounds_by_ticks = list(zip(round_start_ticks, round_end_ticks))
        print(f"Rounds by tick: {rounds_by_ticks}")
        
        # Storing the metadata files
        metadata = self._get_match_metadata(hash_value, filepath, parser, len(rounds_by_ticks))
        DemoFileStore.store_metadata_file(hash_value, metadata)

        # Storing the Parquet files and deleting the input demo file
        DemoFileStore.store_demo_file(
            hash_value, all_ticks_df, rounds_by_ticks)
        if os.path.exists(filepath) and os.path.isfile(filepath):
            os.remove(filepath)
