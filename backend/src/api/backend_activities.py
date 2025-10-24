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

@app.post(f"/{DEMO_INGESTOR_ENDPOINT_PREFIX}")
async def ingest_demo(file: UploadFile = File(...)):
    """
    Ingests the demo using the input file.
    
    The file will first be stored locally before calling this method. This method then passes that filepath into the manager for processing.
    """
    
    # Check if filename exists
    if file.filename is None:
        return {"error": "File must have a filename"}
    
    # Save the uploaded file to the uploads directory
    file_location = os.path.join(UPLOADED_DEMOS_DIR, file.filename)
    
    with open(file_location, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Process the file
    try:
        demo_ingestor_manager.ingest_demo(file_location)
        return {"message": "Demo ingested successfully", "filename": file.filename}
    except Exception as e:
        return {"error": f"Failed to ingest demo: {str(e)}"}
