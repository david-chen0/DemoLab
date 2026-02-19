from dotenv import load_dotenv
import logging
import json
import os
import sys
from datetime import datetime, timezone

# Load env variables
load_dotenv()

LOG_FILE = "application.log" # File we log to for local development
IS_DEV_ENV = "IS_DEV_ENV" # Environment variable indicating whether we are executing this in a dev environment

class JsonFormatter(logging.Formatter):
    """
    This class inherits the logging formatter and is our custom formatter to change how our logs look.
    
    UTC isn't required for timestamp, but it needs to be the same as what we have setup for the frontend, so we stick with UTC.
    """
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": record.levelname, # GCP logging expects severity instead of level
            "file": record.filename,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        
        # Include exception information if available
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log)

# Set up the handler depending on the execution environment
if os.getenv(IS_DEV_ENV):
    handler = logging.FileHandler(LOG_FILE, mode="a") # Log to local file for local testing
else:
    handler = logging.StreamHandler(sys.stdout) # Log to stdout for Cloud Run
handler.setFormatter(JsonFormatter())
    
# Initialize the logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.handlers.clear() # Prevents duplicate logs
logger.addHandler(handler)
logger.propagate = False
