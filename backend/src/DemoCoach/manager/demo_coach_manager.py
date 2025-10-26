import os
import pandas as pd
from typing import Optional
from ...util.demo_file_store import DemoFileStore


class DemoCoachManager:
    """
    This class handles all the business logic for running demo coach. The main purpose of this will be to serve the frontend.
    """

    def __init__(self): return

    def get_demo_data(self, hash_value: Optional[str], round_num: Optional[int]) -> pd.DataFrame:
        """
        Gets the demo data and returns it as a Pandas DF
        """
        if not hash_value:
            print("Fetching random demo dataset amongst stored datasets")
        elif not round_num:
            print(
                f"Fetching dataset for all rounds for demo file {hash_value}")
        else:
            print(
                f"Fetching dataset for demo file {hash_value} and round number {round_num}")
        dataframe = DemoFileStore.get_demo_file(hash_value, round_num)
        return dataframe
    
    def get_metadata(self, hash_value: str) -> dict:
        """
        Gets the metadata of the demo corresponding to the has value.
        """
        metadata = DemoFileStore.get_metadata(hash_value)
        return metadata
