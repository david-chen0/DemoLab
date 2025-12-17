import pandas as pd
from typing import Optional
from ...util.demo_file_store import DemoFileStore


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
            print(
                f"Fetching {dataset} dataset for all rounds for demo file {hash_value}")
        else:
            print(
                f"Fetching {dataset} dataset for demo file {hash_value} and round number {round_num}")
        return DemoFileStore.get_demo_data(dataset, hash_value, round_num)
    
    def get_metadata(self, hash_value: str) -> dict:
        """
        Gets the metadata of the demo corresponding to the has value.
        """
        metadata = DemoFileStore.get_metadata(hash_value)
        return metadata
