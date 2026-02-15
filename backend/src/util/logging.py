import logging
import json
import os
import sys
from datetime import datetime, timezone

LOG_FILE = "application.log" # File we log to for local development

class JsonFormatter(logging.Formatter):
    """
    This class inherits the logging formatter and is our custom formatter to change how our logs look.
    
    UTC isn't required for timestamp, but it needs to be the same as what we have setup for the frontend, so we stick with UTC.
    """
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "file": record.filename,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        return json.dumps(log)

# Log to local file for local dev, otherwise log to stdout for Render website
if os.getenv("RENDER"): # Auto set to True by Render
    handler = logging.StreamHandler(sys.stdout)
else:
    handler = logging.FileHandler(LOG_FILE, mode="a")
handler.setFormatter(JsonFormatter())

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.handlers.clear() # Prevents duplicate logs
logger.addHandler(handler)
logger.propagate = False
