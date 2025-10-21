from pydantic import Field
from pydantic_settings import BaseSettings

class AppConfig(BaseSettings):
    """
    This class contains the common settings that our entire app will use.
    This can also read from environment or .env, add if interested
    
    Usage example:
    config = AppConfig()
    model_name = config.model_name
    """
    model_name: str = "DemoMind"
    
