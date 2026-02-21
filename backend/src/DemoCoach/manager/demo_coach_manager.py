import pandas as pd
from typing import Optional
from ...dao.storage_factory import get_storage_client
from ...util.logging import logger


class DemoCoachManager:
    """
    This class handles all the business logic for running demo coach. The main purpose of this will be to serve the frontend.
    """

    def __init__(self): return
    
    def get_demo_data(self, dataset: str, hash_value: str, round_num: Optional[int]) -> pd.DataFrame:
        """
        Gets the data for the input arguments and returns it as a Pandas DF
        """
        if not round_num:
            logger.info(f"Fetching {dataset} dataset for all rounds for demo file {hash_value}")
        else:
            logger.info(f"Fetching {dataset} dataset for demo file {hash_value} and round number {round_num}")
        storage_client = get_storage_client(hash_value)
        return storage_client.get_demo_data(dataset, round_num)
    
    def get_metadata(self, hash_value: str) -> dict:
        """
        Gets the metadata of the demo corresponding to the has value.
        """
        storage_client = get_storage_client(hash_value)
        metadata = storage_client.get_metadata()
        return metadata
