import json
import os
import pandas as pd
from typing import Optional
from .base_storage_dao import BaseStorageDao
from ..util.logging import logger

class LocalStorageDao(BaseStorageDao):
    """
    Local file structure:
    demo_data/    <--- Top-level dir
    └── <demo_hash>    <--- Dir for the entire demo
        └── event_data    <--- Dir for event data
            └── round_num=1/    <---- Subdirectory
                └── part-0.parquet  <----- Parquet partition
        └── player_data    <--- Dir for player data
            └── round_num=1/    <---- Subdirectory
                └── part-0.parquet  <----- Parquet partition
        └── metadata.json    <--- Metadata JSON
    """
    
    def __init__(self, demo_id: str):
        super().__init__(demo_id)
    
    def _check_demo_exists(self) -> bool:
        demo_path = self.demo_directory
        return os.path.exists(demo_path)
    
    def _get_demo_state(self) -> str:
        """
        Check the state of the demo in local storage.
        
        Returns:
            "nothing_exists": No demo directory or metadata found
            "demo_exists": Demo directory exists but no metadata (needs ingestion)
            "metadata_exists": Both demo directory and metadata exist (fully processed)
        """
        # Check if metadata exists first (fully processed state)
        if os.path.exists(self.metadata_file_path):
            return "metadata_exists"
        
        # Check if demo directory exists (needs ingestion)
        if os.path.exists(self.demo_directory):
            return "demo_exists"
        
        # Nothing exists (needs file upload)
        return "nothing_exists"
    
    def _store_metadata(self, metadata: dict):
        # This will write into the file if it doesn't exist, otherwise throw an error if it already does
        try:
            parent_dir = self.demo_directory
            os.makedirs(parent_dir, exist_ok=True)
            with open(self.metadata_file_path, "x") as f:
                json.dump(metadata, f, indent=4)
        except FileExistsError:
            logger.info(f"File for demo with ID {self.demo_id} already exists, skipping")
            
    def _get_metadata(self) -> dict:
        with open(self.metadata_file_path, "r") as f:
            return json.load(f)
        
    def _store_demo_files(
        self,
        player_data_df: pd.DataFrame,
        event_data_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        This method takes in the processed player and event Dataframes and stores them in compressed Parquet files.
        The Parquet files are partitioned by round, as each round's data is independent of each other.
        We choose Parquet since there is a large amount of data and the file only needs to be constructed once, but read multiple times
        In addition, Parquet handles and compresses null values well
        Compression will be done with Snappy

        args:
            player_data_df: Dataframe containing all the player data, sorted by tick
            event_data_df: Dataframe containing all the event data, sorted by tick
            rounds_by_ticks: List of (start_tick, end_tick) tuples representing the rounds
        """
        # Create the base demo directory if it doesn't exist, otherwise storing the Parquet file will fail
        demo_path = self.demo_directory
        os.makedirs(demo_path, exist_ok=True)

        # We need to manually count the rounds rather than relying on the round number in the DF since
        # the game data could display the round wrong(ex: Faceit counting knife round as round 1)
        # TODO: SOME GAME MODES ALSO HAVE EXTRA ROUNDS IN THE BEGINNING(EX: FACEIT HAS 3 EXTRA ROUNDS) THAT WE NEED TO OMIT
        round_num = 1
        for round_start_tick, round_end_tick in rounds_by_ticks:
            # Storing the player data for the round
            player_output_path = f"{demo_path}/player_data"
            os.makedirs(player_output_path, exist_ok=True)
            round_player_df = self.store_round_data_helper(player_data_df, round_start_tick, round_end_tick, round_num)
            round_player_df.to_parquet(
                player_output_path,
                engine="pyarrow",
                compression="snappy",
                partition_cols=[self.SYNTHETIC_ROUND_NUM_COL_NAME],
                index=False,
            )
            
            # Storing the event data for the round
            event_output_path = f"{demo_path}/event_data"
            os.makedirs(event_output_path, exist_ok=True)
            round_event_df = self.store_round_data_helper(event_data_df, round_start_tick, round_end_tick, round_num)
            round_event_df.to_parquet(
                event_output_path,
                engine="pyarrow",
                compression="snappy",
                partition_cols=[self.SYNTHETIC_ROUND_NUM_COL_NAME],
                index=False,
            )

            logger.info(f"Created the Parquet partition for round {round_num}")
            round_num += 1

        logger.info(f"Finished creating all Parquet files for demo {self.demo_id}")
        
    def _get_demo_data(
        self,
        dataset: str,
        round_num: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Retrieves the demo corresponding to the input dataset and game(via demo_id).
        If round_num is provided, then it will only retrieve the Parquet partition for that round. round_num can not be specified if demo_id is not specified.
        If none of these values are provided, then the entire demo of the first alphanumeric demo we have stored will be returned.

        args:
            dataset: The dataset to fetch for(ex: player_data, event_data)
            demo_id: The optional hash value of the demo, which is what we use to identify the demos
            round_num: The optional round number to retrieve the data for
        """
        # Checking if the processed demo directory has any files/subdirectories
        entries = sorted(os.listdir(BaseStorageDao.DEMO_DATA_DIRECTORY))
        if not entries:
            raise FileNotFoundError("No processed demo files exist yet.")

        # Filepath of the demo
        filepath = f"{self.demo_directory}/{dataset}"

        if round_num:
            # Getting the number of rounds by counting the number of sub-directories that start with 'round_num='
            metadata = self.get_metadata()
            num_rounds = metadata['num_rounds']
            if round_num > num_rounds:
                raise ValueError(
                    f"Data for round number {round_num} was requested, but only {num_rounds} rounds exist for this demo.")

            # Setting the filepath to only the round partition that we want to read
            filepath += f"/round_num={round_num}"

        return pd.read_parquet(filepath, engine="pyarrow")
    
    def _generate_signed_upload_url(
        self,
        filename: str,
        content_type: str,
        expiration_minutes: int
    ) -> str:
        """
        LocalStorageDao does not support signed URLs since files are stored locally.
        This method should not be called for local storage.
        """
        raise NotImplementedError(
            "Signed URL generation is not supported for local storage. "
            "Files should be uploaded directly to the local filesystem."
        )
