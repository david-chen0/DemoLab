from abc import ABC, abstractmethod
import pandas as pd
from typing import Optional
from ..config.demo_parser_props import DemoParserPlayerProps
from ..util.logging import logger

class BaseStorageDao(ABC):
    # Override the methods with _ in front of it, but call the ones without a _ in front of it
    
    # Constants
    DEMO_DATA_DIRECTORY = "demo_data"
    METADATA_FILE = "metadata.json"
    SYNTHETIC_ROUND_NUM_COL_NAME = "round_num"
    
    # Variables
    demo_id: str # The ID of the demo that this instance is meant to process
    
    def __init__(self, demo_id: str):
        self.demo_id = demo_id
        self.demo_directory = f"{BaseStorageDao.DEMO_DATA_DIRECTORY}/{self.demo_id}" # Name of the directory for the demo
        self.metadata_file_path = f"{self.demo_directory}/{self.METADATA_FILE}" # Name of the file for the metadata
        
        
    # Common Helper methods
    def store_round_data_helper(
        self,
        data_df: pd.DataFrame,
        round_start_tick: int,
        round_end_tick: int,
        round_num: int,
    ) -> pd.DataFrame:
        """
        Helper method to format and return round data for either player or event DataFrames.

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
        round_df[self.SYNTHETIC_ROUND_NUM_COL_NAME] = round_num
        return round_df
    
    
    # Methods to call and override
    def check_demo_exists(self) -> bool:
        logger.info(f"check_demo_exists(demo_id={self.demo_id})")
        return self._check_demo_exists()
    
    @abstractmethod
    def _check_demo_exists(self) -> bool:
        """
        Checks whether the demo corresponding to the demo ID has already been processed.
        """
        pass
    
    
    def store_metadata(self, metadata: dict):
        logger.info(f"store_metadata_file(demo_id={self.demo_id})")
        self._store_metadata(metadata)
    
    @abstractmethod
    def _store_metadata(self, metadata: dict):
        """
        Stores the metadata file in JSON format for the game corresponding to the demo ID
        """
        pass
    
    
    def get_metadata(self) -> dict:
        logger.info(f"get_metadata(demo_id={self.demo_id})")
        return self._get_metadata()
        
    @abstractmethod
    def _get_metadata(self) -> dict:
        """
        Returns the metadata dict for the demo corresponding to the input demo ID
        """
        pass
    
    
    def store_demo_files(
        self,
        player_data_df: pd.DataFrame,
        event_data_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        logger.info(f"store_demo_files(demo_id={self.demo_id}, player_data_df, event_data_df, rounds_by_ticks={rounds_by_ticks})")
        self._store_demo_files(player_data_df, event_data_df, rounds_by_ticks)
        
    @abstractmethod
    def _store_demo_files(
        self,
        player_data_df: pd.DataFrame,
        event_data_df: pd.DataFrame,
        rounds_by_ticks: list[tuple[int, int]],
    ):
        """
        Stores the demo files corresponding to the given demo ID using the input player data, event data, and rounds.
        """
        pass
    
    
    def get_demo_data(
        self,
        dataset: str,
        round_num: Optional[int] = None,
    ) -> pd.DataFrame:
        logger.info(f"get_demo_data(dataset={dataset}, demo_id={self.demo_id}, round_num={round_num})")
        return self._get_demo_data(dataset, round_num)
        
    @abstractmethod
    def _get_demo_data(
        self,
        dataset: str,
        round_num: Optional[int],
    ) -> pd.DataFrame:
        """
        Retrieves the demo data corresponding to the requested dataset and demo ID. Round number can also be specified
        """
        pass
