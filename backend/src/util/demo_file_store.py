import blake3
import json
import os
import pandas as pd
from typing import Optional
from ..config.demo_parser_props import DemoParserProps


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
            print(f"File for demo with ID {hash_value} already exists, skipping")

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
    def store_demo_file(
        hash_value: str,
        all_ticks_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        This method takes in the input demo data and stores it in a compressed Parquet file.
        The ticks are partitioned by round, as each round's data is independent of each other
        The Parquet file is partitioned by round, giving structure like:
        demo_data/    <--- Top-level dir
        └── <demo_hash>/    <--- Dir for the entire demo
            └── round_num=1/      <---- Subdirectory
                └── part-0.parquet      <----- Parquet partition
            └── round_num=2/
                └── part-0.parquet
                ...
            └── round_num=24/
                └── part-0.parquet
            We choose Parquet since there is a large amount of data and the file only needs to be constructed once, but read multiple times
            Can easily convert Parquet files to JSON for human readability(if required)
            Compression will be done with TODO: figure out what compression(ex: snappy, ZSTD, BROTLI)

        args:
        all_ticks_df: Dataframe containing all the info we want at each tick. Function assumes data is sorted by tick
        rounds_by_ticks: List of (start_tick, end_tick) tuples representing the rounds

        TODO: THIS IS CURRENTLY STORED LOCALLY, MOVE IT OVER TO STORE IN BLOB STORE(OR WHATEVER WE DECIDE)
        """
        # Checking if the file has already been stored locally. If so, then we skip
        if hash_value in os.listdir(DemoFileStore.DEMO_DIRECTORY):
            print(
                f"Demo corresponding to ID {hash_value} already exists, skipping storing.")
            return

        # We need to manually count the rounds rather than relying on the round number in the DF since
        # the game data could display the round wrong(ex: Faceit counting knife round as round 1)
        # TODO: SOME GAME MODES ALSO HAVE EXTRA ROUNDS IN THE BEGINNING(EX: FACEIT HAS 3 EXTRA ROUNDS) THAT WE NEED TO OMIT
        round_num = 1
        for round_prestart_tick, round_end_tick in rounds_by_ticks:
            # Normalize the fields
            # TODO: add the normalizations. if not needed then remove this

            # Partition the DataFrame to get all the ticks in this round, inclusive of the prestart and end tick
            start_idx = all_ticks_df[DemoParserProps.TICK.value].searchsorted(
                round_prestart_tick, side="left")
            end_idx = all_ticks_df[DemoParserProps.TICK.value].searchsorted(
                round_end_tick, side="right")

            # Create a copy to avoid SettingWithCopyWarning and add the synthetic round number column
            round_df = all_ticks_df.iloc[start_idx:end_idx].copy()
            synthetic_round_num_col_name = "round_num"
            round_df[synthetic_round_num_col_name] = round_num

            # Store the partition in a compressed Parquet file
            round_df.to_parquet(
                f"{DemoFileStore.DEMO_DIRECTORY}/{hash_value}",
                engine="pyarrow",
                compression="snappy",  # TODO: Figure out if this is actually the one we want to use
                partition_cols=[synthetic_round_num_col_name],
                index=False,
            )
            print(f"Created the Parquet partition for round {round_num}")
            round_num += 1

    @staticmethod
    def get_demo_file(
        hash_value: Optional[str] = None,
        round_num: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Retrieves the demo corresponding to the input.
        If hash_value is provided, then it will retrieve the demo that has the corresponding hash value.
        If round_num is provided, then it will only retrieve the Parquet partition for that round. round_num can not be specified if hash_value is not specified.
        If none of these values are provided, then the entire demo of the first alphanumeric demo we have stored will be returned.

        args:
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
        if not hash_value: # Assigning hash value to be a random demo's hash
            hash_value = entries[0]

        # If no hash_value is provided, gets the first file from the demo location, sorted alphanumerically
        filepath = f"{DemoFileStore.DEMO_DIRECTORY}/{hash_value}"

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
