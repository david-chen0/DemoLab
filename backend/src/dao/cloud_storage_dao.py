from google.cloud import storage
from google.api_core.exceptions import NotFound
import json
import os
import pandas as pd
from typing import Optional
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from .base_storage_dao import BaseStorageDao
from ..util.logging import logger


class CloudStorageDao(BaseStorageDao):
    """
    Cloud bucket structure:
    demo_data/    <--- Bucket
    └── <demo_hash>    <--- Dir for the entire demo
        └── demo file(.dem)    <--- The actual demo itself, uploaded from the frontend
        └── event_data    <--- Dir for event data
            └── round_num=1/    <---- Subdirectory
                └── part-0.parquet  <----- Parquet partition
        └── player_data    <--- Dir for player data
            └── round_num=1/    <---- Subdirectory
                └── part-0.parquet  <----- Parquet partition
        └── metadata.json    <--- Metadata JSON

    Note that GCP Cloud Storage is flat, so even though the file could be hierarchically at <demo_hash>/metadata.json, this is just a file with that path as the name
    """

    BUCKET_NAME = "demo-lab-demo-data"  # Global bucket name in GCP Storage

    def __init__(self, demo_id: str):
        super().__init__(demo_id)

        # Initialize GCP Storage bucket
        # TODO: What happens if there are multiple instances of this class? Should we make a global client and then buckets per class/demo?
        client = storage.Client()
        self.bucket = client.bucket(self.BUCKET_NAME)

    def get_parquet_blob_name(self, dataset: str, round_num: int) -> str:
        """
        Helper method to generate the blob name for a parquet file.
        
        args:
            dataset: The dataset name (e.g., 'player_data', 'event_data')
            round_num: The round number
            
        returns:
            The full blob name for the parquet file
        """
        return f"{self.demo_directory}/{dataset}/round_num={round_num}/part-0.parquet"

    def _check_demo_exists(self) -> bool:
        # We can only check if files exist, so we check if the metadata file exists
        blob = self.bucket.blob(self.metadata_file_path)
        return blob.exists()

    def _store_metadata(self, metadata: dict):
        metadata_json = json.dumps(metadata, indent=4)
        blob = self.bucket.blob(self.metadata_file_path)
        blob.upload_from_string(metadata_json, content_type="application/json")

    def _get_metadata(self) -> dict:
        blob = self.bucket.blob(self.metadata_file_path)
        try:
            data = blob.download_as_bytes()
        except NotFound as e:
            message = f"Metadata file {self.metadata_file_path} does not exist in the bucket"
            logger.info(message)
            raise FileNotFoundError(message)
        return json.loads(data)

    def _store_demo_files(
        self,
        player_data_df: pd.DataFrame,
        event_data_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        This method takes in the processed player and event Dataframes and stores them in compressed Parquet files in GCP Storage.
        The Parquet files are partitioned by round, as each round's data is independent of each other.
        We choose Parquet since there is a large amount of data and the file only needs to be constructed once, but read multiple times.
        In addition, Parquet handles and compresses null values well.
        Compression will be done with Snappy.

        For efficiency with multiple files, we use concurrent uploads to GCP Storage.

        args:
            player_data_df: Dataframe containing all the player data, sorted by tick
            event_data_df: Dataframe containing all the event data, sorted by tick
            rounds_by_ticks: List of (start_tick, end_tick) tuples representing the rounds
        """
        # We need to manually count the rounds rather than relying on the round number in the DF since
        # the game data could display the round wrong(ex: Faceit counting knife round as round 1)
        # TODO: SOME GAME MODES ALSO HAVE EXTRA ROUNDS IN THE BEGINNING(EX: FACEIT HAS 3 EXTRA ROUNDS) THAT WE NEED TO OMIT

        # Prepare all upload tasks for concurrent execution
        upload_tasks = []
        round_num = 1
        for round_start_tick, round_end_tick in rounds_by_ticks:
            # Prepare player data for this round
            round_player_df = self.store_round_data_helper(
                player_data_df, round_start_tick, round_end_tick, round_num)
            player_blob_name = self.get_parquet_blob_name("player_data", round_num)
            upload_tasks.append(
                ('player', round_player_df, player_blob_name, round_num))

            # Prepare event data for this round
            round_event_df = self.store_round_data_helper(
                event_data_df, round_start_tick, round_end_tick, round_num)
            event_blob_name = self.get_parquet_blob_name("event_data", round_num)
            upload_tasks.append(
                ('event', round_event_df, event_blob_name, round_num))

            round_num += 1

        def upload_parquet_to_gcs(df: pd.DataFrame, blob_name: str):
            """
            Helper method to upload a DataFrame as a Parquet file to GCS.

            args:
                df: The DataFrame to upload
                blob_name: The full path in the bucket where the file should be stored
            """
            blob = self.bucket.blob(blob_name)
            buffer = BytesIO()

            try:
                # Write parquet directly into buffer
                df.to_parquet(
                    buffer,
                    index=False,
                    engine="pyarrow",
                    compression="snappy"
                )

                buffer.seek(0)

                # Upload to GCS
                blob.upload_from_file(
                    buffer,
                    content_type="application/vnd.apache.parquet",
                )

            finally:
                buffer.close()

        # Execute uploads concurrently for better performance
        # Limit concurrent uploads to avoid overwhelming GCP
        max_workers = min(8, len(upload_tasks))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all upload tasks
            future_to_task = {
                executor.submit(upload_parquet_to_gcs, task[1], task[2]): task
                for task in upload_tasks
            }

            # Process completed uploads
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                data_type, df, blob_name, round_number = task

                try:
                    future.result()  # This will raise an exception if the upload failed
                    logger.info(
                        f"Successfully uploaded {data_type} data for round {round_number}")
                except Exception as exc:
                    logger.error(
                        f"Failed to upload {data_type} data for round {round_number}: {exc}")
                    raise exc

        logger.info(
            f"Finished creating all Parquet files for demo {self.demo_id}")

    def _get_demo_data(
        self,
        dataset: str,
        round_num: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Retrieves the demo corresponding to the input dataset and game(via demo_id).
        If round_num is provided, then it will only retrieve the Parquet partition for that round.

        args:
            dataset: The dataset to fetch for(ex: player_data, event_data)
            round_num: The optional round number to retrieve the data for
        """
        if round_num:
            # Getting the number of rounds by counting the number of sub-directories that start with 'round_num='
            metadata = self.get_metadata()
            num_rounds = metadata['num_rounds']
            if round_num > num_rounds:
                raise ValueError(
                    f"Data for round number {round_num} was requested, but only {num_rounds} rounds exist for this demo.")

            # Get the specific round partition
            blob_name = self.get_parquet_blob_name(dataset, round_num)
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                raise FileNotFoundError(
                    f"Parquet file not found at {blob_name}")

            # Download and read the parquet file
            buffer = BytesIO()
            blob.download_to_file(buffer)
            buffer.seek(0)
            return pd.read_parquet(buffer, engine="pyarrow")
        else:
            # Get all rounds for the dataset
            metadata = self.get_metadata()
            num_rounds = metadata['num_rounds']

            dfs = []
            for round_number in range(1, num_rounds + 1):
                blob_name = self.get_parquet_blob_name(dataset, round_number)
                blob = self.bucket.blob(blob_name)

                if blob.exists():
                    buffer = BytesIO()
                    blob.download_to_file(buffer)
                    buffer.seek(0)
                    df = pd.read_parquet(buffer, engine="pyarrow")
                    dfs.append(df)

            if not dfs:
                raise FileNotFoundError(
                    f"No parquet files found for dataset {dataset}")

            # Concatenate all rounds
            return pd.concat(dfs, ignore_index=True)
    
    def _generate_signed_upload_url(
        self,
        filename: str,
        content_type: str,
        expiration_minutes: int
    ) -> str:
        """
        Generates a V4 signed URL for uploading a file to GCP Cloud Storage.
        
        Args:
            filename: The name of the file to upload
            content_type: The MIME type of the file
            expiration_minutes: How long the URL should be valid in minutes
            
        Returns:
            A V4 signed URL string that can be used to upload the file
        """
        # Create the full blob path within the demo directory
        blob_path = f"{self.demo_directory}/{filename}"
        blob = self.bucket.blob(blob_path)
        
        # Calculate expiration time
        expiration = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
        
        # Generate the V4 signed URL for PUT operations (upload)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=expiration,
            method="PUT",
            content_type=content_type,
        )
        
        logger.info(f"Generated signed upload URL for {blob_path}, expires at {expiration}")
        return signed_url
