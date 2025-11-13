import blake3
import json
import os
import pandas as pd
from typing import Optional
from ..config.demo_parser_props import DemoParserPlayerProps


class DemoFileStore:
    # Location we will be storing the data
    DEMO_DIRECTORY = "demo_data"
    METADATA_DIRECTORY = "metadata"

    @staticmethod
    def get_file_hash(
        filepath: str
    ) -> str:
        """
        Computes the file's hash using the file content and returns it. This hash is what we used to uniquely identify our demos.
        Each hash is 64 char long and is not affected by metadata(ex: filename).
        """
        hasher = blake3.blake3()

        # Updating the hash in 4MB chunks
        chunk_size = 4 * (1024 ** 2)
        with open(filepath, "rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)

        return hasher.hexdigest()

    @staticmethod
    def store_metadata_file(
        hash_value: str,
        metadata: dict,
    ):
        """
        Stores the metadata file in JSON format for the game corresponding to the input hash value
        """
        print(f"Storing metadata for demo with ID {hash_value}")

        # This will write into the file if it doesn't exist, otherwise throw an error if it already does
        try:
            with open(f"{DemoFileStore.METADATA_DIRECTORY}/{hash_value}.json", "x") as f:
                json.dump(metadata, f, indent=4)
        except FileExistsError:
            print(
                f"File for demo with ID {hash_value} already exists, skipping")

    @staticmethod
    def get_metadata(
        hash_value: str,
    ) -> dict:
        """
        Returns the metadata dict for the demo corresponding to the input hash value
        """
        print(f"Fetching metadata for demo with ID {hash_value}")

        with open(f"{DemoFileStore.METADATA_DIRECTORY}/{hash_value}.json", "r") as f:
            return json.load(f)

    @staticmethod
    def store_demo_files(
        hash_value: str,
        player_data_df: pd.DataFrame,
        event_data_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        This method takes in the processed player and event Dataframes and stores them in compressed Parquet files.
        The Parquet files are partitioned by round, as each round's data is independent of each other.
        The Parquet structure:
        demo_data/    <--- Top-level dir
        └── <demo_hash>/    <--- Dir for the entire demo
            └── player_data    <--- Dir for player data
                └── round_num=1/    <---- Subdirectory
                    └── part-0.parquet  <----- Parquet partition
                    ...
                └── round_num=24/
                    └── part-0.parquet
            └── event_data    <--- Dir for event data
                └── round_num=1/    <--- Round subdirectory
                    └── part-0.parquet  <----- Parquet partition
                    ...
                └── round_num=24/
                    └── part-0.parquet
            We choose Parquet since there is a large amount of data and the file only needs to be constructed once, but read multiple times
            In addition, Parquet handles and compresses null values well
            Compression will be done with Snappy

        args:
            hash_value: The hash value of the demo file, which is what we use to ID the demo
            player_data_df: Dataframe containing all the player data, sorted by tick
            event_data_df: Dataframe containing all the event data, sorted by tick
            rounds_by_ticks: List of (start_tick, end_tick) tuples representing the rounds

        TODO: THIS IS CURRENTLY STORED LOCALLY, MOVE IT OVER TO STORE IN BLOB STORE(OR WHATEVER WE DECIDE)
        """
        # Checking if the file has already been stored locally. If so, then we skip
        demo_path = f"{DemoFileStore.DEMO_DIRECTORY}/{hash_value}"
        if os.path.exists(demo_path):
            print(
                f"Demo corresponding to ID {hash_value} already exists, skipping storing.")
            return

        # Create the base demo directory if it doesn't exist, otherwise storing the Parquet file will fail
        os.makedirs(DemoFileStore.DEMO_DIRECTORY, exist_ok=True)

        def store_round_data_helper(
            data_df: pd.DataFrame,
            output_path: str,
            round_start_tick: int,
            round_end_tick: int,
            round_num: int,
        ):
            """
            Nested helper method to store round data for either player or event DataFrames.

            Args:
                data_df: The DataFrame containing the data to partition and store
                output_path: The path where the parquet file should be stored
                round_start_tick: The starting tick for this round
                round_end_tick: The ending tick for this round
                round_num: The round number to use for partitioning
            """
            # Partition the DataFrame to get all the ticks in this round, inclusive of the prestart and end tick
            start_idx = data_df[DemoParserPlayerProps.TICK.value].searchsorted(
                round_start_tick, side="left")
            end_idx = data_df[DemoParserPlayerProps.TICK.value].searchsorted(
                round_end_tick, side="right")

            # Create a copy to avoid SettingWithCopyWarning and add the synthetic round number column
            round_df = data_df.iloc[start_idx:end_idx].copy()
            synthetic_round_num_col_name = "round_num"
            round_df[synthetic_round_num_col_name] = round_num

            # Create the output directory if it doesn't exist, otherwise storing the Parquet file will fail
            os.makedirs(output_path, exist_ok=True)

            # Store the partition in a compressed Parquet file
            round_df.to_parquet(
                output_path,
                engine="pyarrow",
                compression="snappy",
                partition_cols=[synthetic_round_num_col_name],
                index=False,
            )

        # We need to manually count the rounds rather than relying on the round number in the DF since
        # the game data could display the round wrong(ex: Faceit counting knife round as round 1)
        # TODO: SOME GAME MODES ALSO HAVE EXTRA ROUNDS IN THE BEGINNING(EX: FACEIT HAS 3 EXTRA ROUNDS) THAT WE NEED TO OMIT
        round_num = 1
        path_prefix = f"{DemoFileStore.DEMO_DIRECTORY}/{hash_value}"
        for round_start_tick, round_end_tick in rounds_by_ticks:
            # Process and store both player and event data for this round
            store_round_data_helper(
                player_data_df, f"{path_prefix}/player_data", round_start_tick, round_end_tick, round_num
            )
            store_round_data_helper(
                event_data_df, f"{path_prefix}/event_data", round_start_tick, round_end_tick, round_num
            )

            print(f"Created the Parquet partition for round {round_num}")
            round_num += 1

        print(f"Finished creating all Parquet files for demo {hash_value}")

    @staticmethod
    def get_demo_data(
        dataset: str,
        hash_value: Optional[str] = None,
        round_num: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Retrieves the demo corresponding to the input.
        If hash_value is provided, then it will retrieve the demo that has the corresponding hash value.
        If round_num is provided, then it will only retrieve the Parquet partition for that round. round_num can not be specified if hash_value is not specified.
        If none of these values are provided, then the entire demo of the first alphanumeric demo we have stored will be returned.

        args:
            dataset: The dataset to fetch for(ex: player_data, event_data)
            hash_value: The optional hash value of the demo, which is what we use to identify the demos
            round_num: The optional round number to retrieve the data for
        """
        if round_num and not hash_value:
            raise ValueError(
                "Round number can not be specified if hash value is not specified.")

        # Checking if the processed demo directory has any files/subdirectories
        entries = sorted(os.listdir(DemoFileStore.DEMO_DIRECTORY))
        if not entries:
            raise FileNotFoundError("No processed demo files exist yet.")
        if not hash_value:  # Assigning hash value to be a random demo's hash
            hash_value = entries[0]

        # If no hash_value is provided, gets the first file from the demo location, sorted alphanumerically
        filepath = f"{DemoFileStore.DEMO_DIRECTORY}/{hash_value}/{dataset}"

        if round_num:
            # Getting the number of rounds by counting the number of sub-directories that start with 'round_num='
            metadata = DemoFileStore.get_metadata(hash_value)
            num_rounds = metadata['num_rounds']
            if round_num > num_rounds:
                raise ValueError(
                    f"Data for round number {round_num} was requested, but only {num_rounds} rounds exist for this demo.")

            # Setting the filepath to only the round partition that we want to read
            filepath += f"/round_num={round_num}"

        return pd.read_parquet(filepath, engine="pyarrow")
