import datetime
import os
import pandas as pd
from typing import Optional
from demoparser2 import DemoParser
from ...config.demo_parser_events import DemoParserEvents
from ...config.demo_parser_props import DemoParserPlayerProps
from ...util.backoff_wrapper import BackoffWrapper
from ...util.demo_file_store import DemoFileStore
from ...util.logging import logger


class DemoIngestorManager:
    """
    This class handles all the business logic for demo ingestion.
    """

    # List of player properties that we want to process
    wanted_player_props = DemoParserPlayerProps.to_strings([
        # Player position and movement properties
        DemoParserPlayerProps.X,
        DemoParserPlayerProps.Y,
        DemoParserPlayerProps.Z,
        DemoParserPlayerProps.PITCH,
        DemoParserPlayerProps.YAW,
        DemoParserPlayerProps.VELOCITY_X,
        DemoParserPlayerProps.VELOCITY_Y,
        DemoParserPlayerProps.VELOCITY_Z,

        # Player state properties
        DemoParserPlayerProps.HP,
        DemoParserPlayerProps.IS_ALIVE,
        DemoParserPlayerProps.IS_DEFUSING,
        DemoParserPlayerProps.IS_IN_BOMBSITE,
        DemoParserPlayerProps.IS_IN_BUY_ZONE,
        DemoParserPlayerProps.IS_SCOPED,
        DemoParserPlayerProps.IS_WALKING,
        DemoParserPlayerProps.IS_DUCKING,

        # Player identity
        DemoParserPlayerProps.PLAYER_NAME,
        DemoParserPlayerProps.PLAYER_STEAMID,
        DemoParserPlayerProps.TEAM_NAME,
        DemoParserPlayerProps.TEAM_NUM,

        # Economy & Equipment Properties
        DemoParserPlayerProps.CASH,
        DemoParserPlayerProps.EQUIPMENT_VALUE_THIS_ROUND,
        DemoParserPlayerProps.CASH_SPENT_THIS_ROUND,
        DemoParserPlayerProps.ARMOR_VALUE,
        DemoParserPlayerProps.HAS_HELMET,
        DemoParserPlayerProps.HAS_DEFUSE_KIT,

        # Weapon & Equipment Properties
        DemoParserPlayerProps.ACTIVE_WEAPON_NAME,
        DemoParserPlayerProps.ACTIVE_WEAPON_AMMO,
        DemoParserPlayerProps.ACTIVE_WEAPON_RESERVE,
        DemoParserPlayerProps.FLASH_DURATION,
        DemoParserPlayerProps.FLASH_MAX_ALPHA,

        # Game State Properties
        DemoParserPlayerProps.TICK,
        DemoParserPlayerProps.KILLS,
        DemoParserPlayerProps.DEATHS,
        DemoParserPlayerProps.ASSISTS,
    ])
    
    # List of game events that we want to process
    wanted_game_events = DemoParserEvents.to_strings([
        DemoParserEvents.BEGIN_NEW_MATCH,
        DemoParserEvents.BOMB_DEFUSED,
        DemoParserEvents.BOMB_DROPPED,
        DemoParserEvents.BOMB_EXPLODED,
        DemoParserEvents.BOMB_PICKUP,
        DemoParserEvents.BOMB_PLANTED,
        DemoParserEvents.FLASHBANG_DETONATE,
        DemoParserEvents.GRENADE_THROWN,
        DemoParserEvents.HEGRENADE_DETONATE,
        DemoParserEvents.INFERNO_EXPIRE,
        DemoParserEvents.INFERNO_STARTBURN,
        DemoParserEvents.ITEM_PICKUP,
        DemoParserEvents.PLAYER_DEATH,
        DemoParserEvents.PLAYER_GIVEN_C4,
        DemoParserEvents.ROUND_ANNOUNCE_MATCH_START,
        DemoParserEvents.ROUND_END,
        DemoParserEvents.ROUND_START,
        DemoParserEvents.SMOKEGRENADE_DETONATE,
        DemoParserEvents.SMOKEGRENADE_EXPIRED,
        DemoParserEvents.WEAPON_FIRE,
    ])
    
    # Map from the name of the demo parser event to the Pandas DF containing information for that event
    # This is stored to reduce the number of parse_event calls we have to make
    game_event_map: dict[str, pd.DataFrame] = {}

    def __init__(self): return
    
    def _get_ticks_for_events(self, events: list[str]) -> dict[str, list[int]]:
        """
        Returns a dict mapping from the event name to the ticks where that event happened, in ascending tick order.
        """
        event_ticks_map = {}
        for event_name in events:
            # We raise an error here rather than filling the map with an extra parse_events call, as we
            # want to get all the events in the initial query to limit the number of queries
            if event_name not in self.game_event_map:
                raise AssertionError(f"Event {event_name} has not had its data added to the game_event_map yet, this is likely a bug in the code.")

            # TODO: the ticks are npint32 rather than ints, likely isn't causing any issues but might be better for memory to store them as ints instead once we've processed them
            event_ticks_map[event_name] = self.game_event_map[event_name][DemoParserPlayerProps.TICK.value].tolist()
            
        return event_ticks_map

    def _get_match_start_tick(self) -> int:
        """
        Returns the tick that the match started.
        Useful for filtering for all ticks after match start
        """
        # Assigns the value of the query to begin_new_match_events, which then checks if the list corresponding
        # to the key both exists in the dict and is non-empty
        if (
            begin_new_match_events := self._get_ticks_for_events(
                [DemoParserEvents.BEGIN_NEW_MATCH.value]
            ).get(DemoParserEvents.BEGIN_NEW_MATCH.value)
        ):
            return begin_new_match_events[0]
        return 0

    def _get_match_metadata(self, hash_val: str, filepath: str, parser: DemoParser, rounds_by_ticks: list[tuple]) -> dict:
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
        # TODO: VERIFY EXPECTED OUTCOME FOR COMP, PREMIER, AND FACEIT
        metadata['server_type'] = header['server_name']

        # Parsing player info
        metadata['players'] = []
        player_info = parser.parse_player_info()
        # Some demos have weird team numbers(ex: 4-indexed), so we'll map it over to be 1-indexed
        team_number_map = {}
        for __, row in player_info.iterrows():
            team_num = row['team_number']
            if team_num in team_number_map:
                team_number = team_number_map[team_num]
            else:
                team_number = len(team_number_map)
                team_number_map[team_num] = team_number

            metadata['players'].append({
                # Needs to be converted to string to preserve Typescript(frontend later on)'s 64-bit integer precision
                'id': str(row['steamid']),
                'name': row['name'],
                'team': team_number,
            })

        # Extra metadata
        metadata['num_rounds'] = len(rounds_by_ticks)
        # Gets the time that the file was created, not stored
        metadata['match_timestamp'] = datetime.datetime.fromtimestamp(
            os.path.getctime(filepath)).isoformat()
        
        # Round-specific metadata
        # TODO: Need to add more to the round metadata to support the frontend once needed
        # ex: Who won the round, how the round was won, etc
        round_metadata = {}
        for i in range(len(rounds_by_ticks)):
            round_specific_metadata = {} # Metadata for this round
            
            round_start, round_end = rounds_by_ticks[i]
            round_specific_metadata['round_start'] = round_start
            round_specific_metadata['round_end'] = round_end
            
            round_metadata[i + 1] = round_specific_metadata
        metadata['round_metadata'] = round_metadata

        return metadata

    def ingest_demo(self, filepath: str, hash_value: Optional[str] = None):
        """
        This method will ingest and process the raw demo file.

        The current workflow is as follows:
            All events are retrieved, which gives us a list of all ticks that had an event recorded in the game
            Tick for match start is retrieved, which we use to filter for all events that happened after match start
            We query all ticks from the set of ticks after match start, which gives us all the events that happened per tick

            Certain fields are converted and normalized to have a clean and easily readable form
            The ticks are partitioned by round, as each round's data is independent of each other
            The partitioned ticks are then stored in separate Parquet files under the same game's directory, which is named after the game's hash value

            Metadata on the game is also stored locally in the metadata directory as a JSON under the game's hash value name
        """
        # Getting the hash of the file, which is where we'll store it under later
        if hash_value is None:
            hash_value = DemoFileStore.get_file_hash(filepath)

        # If the demo's metadata already exists, we skip ingestion and assume it's already done
        try:
            DemoFileStore.get_metadata(hash_value)
            logger.info(
                f"Found metadata file for demo with ID {hash_value}, skipping ingestion.")
            return
        except FileNotFoundError:
            logger.info(f"Did not find existing metadata file for demo with ID {hash_value}, continuing with ingestion.")

        # Parser for the demo file that we are ingesting
        parser = DemoParser(filepath)

        # TODO: This is just temporary for printing out the entire DFs
        # Specifies to not truncate by column width
        pd.set_option('display.max_columns', None)
        pd.set_option('display.max_colwidth', None)

        # TODO: This is a temporary mechanic to make sure we get all the possible events
        # Once our list of events is exhaustive, remove this section
        all_game_events = BackoffWrapper.with_backoff_expect_result(
            parser.list_game_events
        )
        logger.info(f"All game events found: {all_game_events}")
        for event in all_game_events:
            all_current_events = set(DemoParserEvents.get_all())
            if event not in all_current_events:
                logger.warning(f"Found a new event that is not in our config: {event}")
        
        # Getting all the event information
        game_events = BackoffWrapper.with_backoff_expect_result(parser.parse_events, self.wanted_game_events)
        
        # Getting the tick that the match starts at
        match_start_df = None
        possible_start_events = {DemoParserEvents.BEGIN_NEW_MATCH.value, DemoParserEvents.ROUND_ANNOUNCE_MATCH_START.value}
        for i, (event_name, df) in enumerate(game_events):
            if event_name in possible_start_events:
                match_start_df = df
                # Removing the match start event, since we only need that for backend processes and don't want to send it to the frontend
                game_events.pop(i)
                break
        if match_start_df is None:
            raise AssertionError("Match start tick was not found")
        # TODO: There are many different ways match start is handled, so we just hardcode it to 0 for now and handle any differences below after fetching the ticks.
        # Different clients handle starting and ending games differently, so it's difficult to make a case that works for all
        # match_start_tick = match_start_df[DemoParserPlayerProps.TICK.value][0] - 1 # There should only be one element
        match_start_tick = 0
        
        # Storing the events that happened after match start in game_event_map
        filtered_events = [(event_name, df[df[DemoParserPlayerProps.TICK.value]
                            >= match_start_tick]) for event_name, df in game_events]
        for event_name, event_df in filtered_events:
            # Adding a column to each row of the DF indicating the event type
            event_df['event_type'] = event_name
            
            # Storing the modified event DF into the map
            self.game_event_map[event_name] = event_df
            
        # Merging the event DFs together on top of each other first
        # This will lead to having many columns and null values(since we need to join all columns together), but
        # this is fine since Parquet and Arrow handle null values well
        all_game_events_df = pd.concat(self.game_event_map.values(), ignore_index=True, sort=False)
        # Sorting the entire DF by tick value and removing the old row numbering for a clean 0...N index
        all_game_events_df = all_game_events_df.sort_values(DemoParserPlayerProps.TICK.value).reset_index(drop=True)

        # Getting all the player information at each tick
        all_player_data_df = BackoffWrapper.with_backoff_expect_result(
            parser.parse_ticks,
            wanted_props=self.wanted_player_props,
        ).sort_values(by=DemoParserPlayerProps.TICK.value)
        logger.info(f"Dataframe fields: {all_player_data_df.columns.tolist()}")
        logger.info(f"Number of elements in DF: {str(all_player_data_df.size)}")
        logger.info(f"First two element of DF: {all_player_data_df.head(10)}")

        # Separate the ticks by round
        # Each round is defined by a (start_tick, end_tick) tuple, where the end tick is equal to the start tick of next round
        # Start is defined as when the players spawn in, not when the players are able to move
        # TODO: need to figure out a sanity check for "dummy rounds" like knife round, warmup(non-valve servers mark these as a round), etc
        # ex: Faceit's first three rounds aren't actually rounds, first round is warmup, second is knife, third is warmup while deciding side
        round_start_and_end_ticks = self._get_ticks_for_events([
            DemoParserEvents.ROUND_START.value,
            DemoParserEvents.ROUND_END.value,
        ])
        round_start_ticks = round_start_and_end_ticks[DemoParserEvents.ROUND_START.value]
        round_end_ticks = round_start_and_end_ticks[DemoParserEvents.ROUND_END.value]
        # Number of round starting and ending ticks must be the same. If they are different, we need to adjust it, since there can be edge cases(ex: warmup)
        num_round_diff = len(round_start_ticks) - len(round_end_ticks)
        if num_round_diff != 0:
            if abs(num_round_diff) > 1: # We allow at most one diff
                raise AssertionError(
                    f"There are {len(round_start_ticks)} round starting ticks but {len(round_end_ticks)} round ending ticks, the two need to match.\n" +
                    f"Values for these: Round starting ticks: {round_start_ticks}\n" +
                    f"Round ending ticks: {round_end_ticks}\n"
                )
                
            # TODO: Sanity check these, as there could be other edge cases
            # It's difficult to just have one condition that works for all since different clients have different ways of starting and ending matches
            if num_round_diff > 0: # More starting than ending
                logger.info(f"Found an extra round starting tick, popping it off from the front")
                round_start_ticks = round_start_ticks[1:]
            else:
                logger.info(f"Found an extra round ending tick, popping it off from the front")
                round_end_ticks = round_end_ticks[1:]
                
        rounds_by_ticks = list(zip(round_start_ticks, round_end_ticks))
        # Each round's starting tick must be less than that round's ending tick and greater than the previous round's ending tick
        previous_end_tick = -1
        for start_tick, end_tick in rounds_by_ticks:
            if start_tick > end_tick:
                raise AssertionError(f"Found an instance of a round where starting tick {start_tick} is greater than end tick {end_tick}")
            if start_tick < previous_end_tick:
                raise AssertionError(f"Found an instance where a round's start tick {start_tick} is less than the previous round's end tick {end_tick}")
            previous_end_tick = end_tick
        logger.info(f"Rounds by tick: {rounds_by_ticks}")

        # Storing the metadata files
        metadata = self._get_match_metadata(
            hash_value, filepath, parser, rounds_by_ticks)
        DemoFileStore.store_metadata_file(hash_value, metadata)

        # Storing the Parquet files and deleting the input demo file
        DemoFileStore.store_demo_files(
            hash_value,
            all_player_data_df,
            all_game_events_df,
            rounds_by_ticks
        )
        if os.path.exists(filepath) and os.path.isfile(filepath):
            os.remove(filepath)
