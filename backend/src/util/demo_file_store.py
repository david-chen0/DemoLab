import blake3
import os
import pandas as pd
from typing import Optional
from ..config.demo_parser_props import DemoParserProps


class DemoFileStore:
    # Location we will be storing the data, relative to where we are running the script
    # TODO: will prolly need to change this once we figure out how we actually want to store
    demo_file_location = "demo_data/"

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
    def get_num_rounds(
        hash_value: Optional[str] = None,
        filepath: Optional[str] = None,
    ) -> int:
        """
        Returns the number of rounds that are present in that demo.
        Hash value is the ID of the demo.
        Filepath is the top-level path of the demo's Parquet file directory.
        One of hash value or filepath must be provided. Prioritizes hash value over filepath.
        """
        if not hash_value and not filepath:
            raise ValueError("One of hash value or filepath must be provided.")

        if hash_value:
            filepath = f"{DemoFileStore.demo_file_location}/{hash_value}"

        # Getting the number of rounds by counting the number of sub-directories that start with 'round_num='
        assert filepath is not None  # For compiler, not necessary for runtime
        return sum(
            (os.path.isdir(os.path.join(filepath, sub_file))
             and sub_file.startswith("round_num="))
            for sub_file in os.listdir(filepath)
        )

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
            demo_data/    <--- Path it will be stored at
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
                f"{DemoFileStore.demo_file_location}/{hash_value}",
                engine="pyarrow",
                compression="snappy",  # TODO: Figure out if this is actually the one we want to use
                partition_cols=[synthetic_round_num_col_name],
                index=False,
            )
            print(f"Created the Parquet partition for round {round_num}")

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
        entries = sorted(os.listdir(DemoFileStore.demo_file_location))
        if entries:
            raise FileNotFoundError("No processed demo files exist yet.")

        # If no hash_value is provided, gets the first file from the demo location, sorted alphanumerically
        filepath = f"{DemoFileStore.demo_file_location}/{hash_value}" if hash_value else f"{DemoFileStore.demo_file_location}/{entries[0]}"

        if round_num:
            # Getting the number of rounds by counting the number of sub-directories that start with 'round_num='
            num_rounds = DemoFileStore.get_num_rounds(filepath=filepath)
            if round_num > num_rounds:
                raise ValueError(
                    f"Data for round number {round_num} was requested, but only {num_rounds} rounds exist for this demo.")

            # Setting the filepath to only the round partition that we want to read
            filepath += f"/round_num={round_num}"

        return pd.read_parquet(filepath, engine="pyarrow")
