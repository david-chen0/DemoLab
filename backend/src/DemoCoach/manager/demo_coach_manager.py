import pandas as pd
from typing import Optional
from ...dao.storage_factory import get_storage_dao
from ...util.logging import logger


class DemoCoachManager:
    """
    This class handles all the business logic for running demo coach. The main purpose of this will be to serve the frontend.
    """

    def __init__(self): return
    
    def get_demo_data(self, dataset: str, demo_id: str, round_num: Optional[int]) -> pd.DataFrame:
        """
        Gets the data for the input arguments and returns it as a Pandas DF
        """
        if not round_num:
            logger.info(f"Fetching {dataset} dataset for all rounds for demo file {demo_id}")
        else:
            logger.info(f"Fetching {dataset} dataset for demo file {demo_id} and round number {round_num}")
        storage_client = get_storage_dao(demo_id)
        return storage_client.get_demo_data(dataset, round_num)
    
    def get_metadata(self, demo_id: str) -> dict:
        """
        Gets the metadata of the demo corresponding to the ID.
        """
        storage_client = get_storage_dao(demo_id)
        metadata = storage_client.get_metadata()
        return metadata
