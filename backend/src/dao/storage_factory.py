import os
from dotenv import load_dotenv
from .base_storage_dao import BaseStorageDao
from .cloud_storage_dao import CloudStorageDao
from .local_storage_dao import LocalStorageDao

# Environment variables
load_dotenv()
IS_DEV_ENV = os.getenv("IS_DEV_ENV") # Environment variable indicating whether we are executing this in a dev environment

def get_storage_dao(demo_id: str) -> BaseStorageDao:
    if IS_DEV_ENV:
        return LocalStorageDao(demo_id)
    else:
        return CloudStorageDao(demo_id)
