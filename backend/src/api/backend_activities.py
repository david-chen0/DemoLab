from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import os
from ..DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager

# Constants
DEMO_INGESTOR_ENDPOINT_PREFIX = "demo_ingestor"
UPLOADED_DEMOS_DIR = "uploads"

# Managers
demo_ingestor_manager = DemoIngestorManager()

# App
app = FastAPI()
# Wraps app with CORS handling so that 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server TODO: REPLACE THIS ONCE WE VERIFY WHAT THE SERVER IS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global logic
os.makedirs(UPLOADED_DEMOS_DIR, exist_ok=True) # Makes the uploaded demos dir if it doesn't already exist

"""
====================================================================================
DemoIngestor activities
====================================================================================
"""

@app.get(f"/{DEMO_INGESTOR_ENDPOINT_PREFIX}")
def ingest_demo(file: UploadFile = File(...)):
    """
    Ingests the demo using the input file.
    
    The file will first be stored locally before calling this method. This method then passes that filepath into the manager for processing.
    """
    
    filepath = file.filename
    if filepath is None:
        raise ValueError("File must have a filename specifying its location")
    
    demo_ingestor_manager.ingest_demo(filepath)
