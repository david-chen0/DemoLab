import pandas as pd
from ..config.demo_parser_props import DemoParserProps


class DemoFileStore:
    # Location we will be storing the data, relative to where we are running the script
    # TODO: will prolly need to change this once we figure out how we actually want to store
    demo_file_location = "demo_data/"

    @staticmethod
    def store_demo_file(
        all_ticks_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        This method takes in the input demo data and stores it in a compressed Parquet file.

        args:
        all_ticks_df: Dataframe containing all the info we want at each tick. Function assumes data is sorted by tick
        rounds_by_ticks: List of (start_tick, end_tick) tuples representing the rounds

        TODO: NEED SOME WAY OF UNIQUELY IDENTIFYING THE DEMO FILE
        THAT WAY WE CAN STORE IT IN A LOCATION THAT WE'LL KNOW AND ALSO EASILY PICK IT UP AT ANY TIME

        TODO: THIS IS CURRENTLY STORED LOCALLY, MOVE IT OVER TO STORE IN BLOB STORE(OR WHATEVER WE DECIDE)
        """
        # We need to manually count the rounds rather than relying on the round number in the DF since
        # the game data could display the round wrong(ex: Faceit counting knife round as round 1)
        round_num = 1
        for round_prestart_tick, round_end_tick in rounds_by_ticks:
            # Normalize the fields
            # TODO: add the normalizations. if not needed then remove this

            # Partition the DataFrame to get all the ticks in this round, inclusive of the prestart and end tick
            start_idx = all_ticks_df[DemoParserProps.TICK.value].searchsorted(
                round_prestart_tick, side="left")
            end_idx = all_ticks_df[DemoParserProps.TICK.value].searchsorted(
                round_end_tick, side="right")
            round_df = all_ticks_df.iloc[start_idx:end_idx]

            # Adding a synthetic round number column to give the Parquet file for partitioning
            # TODO: Is there a better way to do this? this makes it so that our slice is a copy rather than a view, which could eat memory and time
            synthetic_round_num_col_name = "round_num"
            round_df[synthetic_round_num_col_name] = round_num
            round_num += 1

            # Store the partition in a compressed Parquet file
            round_df.to_parquet(
                f"{DemoFileStore.demo_file_location}/", # TODO: NEED TO PUT THE UNIQUE IDENTIFIER THERE, WHAT SHOULD IT BE? UUID? BUT HOW WOULD WE GET IT ON READ PATH
                engine="pyarrow",
                compression="snappy",  # TODO: Figure out if this is actually the one we want to use
                partition_cols=[synthetic_round_num_col_name],
                index=False,
            )
            print(f"Created the Parquet partition for round {round_num}")
            
    
        @staticmethod
        def get_demo_file(
            demo_file_id: str,
        ) -> pd.DataFrame:
            """
            Retrieves the demo corresponding to the input.
            This will retrieve all the Parquet partitions, merge them back together, and convert them back to a Pandas DataFrame.
            """
            # TODO: I THINK WHAT WE HAVE TO DO IS NOT CARE ABOUT THE PARQUET FILES
            # FILE NAME SHOULD BE OPTIONAL? WE SHOULD JUST ORDER IT BY TIME AND PROCESS IT LIKE A TIME-BASED QUEUE
            # long term we should process based on demo id and store the processed ids in a db
            # for now, we should just do this with a queue or dict and only process/return it if the queue doesn't contain it
            # or just set up postgre or smth like that
            return 
