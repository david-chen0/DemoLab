import io
import os
import pyarrow as pa
import pyarrow.ipc as ipc
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Optional
from ..DemoCoach.manager.demo_coach_manager import DemoCoachManager
from ..DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager
from ..util.demo_file_store import DemoFileStore

# Constants
DEMO_COACH_ENDPOINT_PREFIX = "demo_coach"
DEMO_INGESTOR_ENDPOINT_PREFIX = "demo_ingestor"
UPLOADED_DEMOS_DIR = "uploads"
MESSAGE_HEADER = "message"
ERROR_HEADER = "error"

# Managers
demo_coach_manager = DemoCoachManager()
demo_ingestor_manager = DemoIngestorManager()

# App
app = FastAPI()
# Wraps app with CORS handling so that
app.add_middleware(
    CORSMiddleware,
    # React dev server TODO: REPLACE THIS ONCE WE VERIFY WHAT THE SERVER IS
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global logic
# Makes the uploaded demos dir if it doesn't already exist
os.makedirs(UPLOADED_DEMOS_DIR, exist_ok=True)

"""
====================================================================================
DemoCoach activities
====================================================================================
"""

@app.get(f"/{DEMO_COACH_ENDPOINT_PREFIX}/get_num_rounds")
async def get_num_rounds(demo_id: str) -> Dict:
    """
    Gets the number of rounds for the demo corresponding to the provided ID
    """
    print(f"get_num_rounds(demo_id={demo_id})")
    try:
        num_rounds = DemoFileStore.get_num_rounds(demo_id)
        return {MESSAGE_HEADER: f"Found {num_rounds} rounds for demo with ID {demo_id}", "numRounds": num_rounds}
    except Exception as e:
        return {ERROR_HEADER: f"Failed to find the number of rounds for demo with ID {demo_id}: {str(e)}"}


@app.get(f"/{DEMO_COACH_ENDPOINT_PREFIX}/get_demo_data")
async def get_demo_data(demo_id: Optional[str], round_num: Optional[int]) -> StreamingResponse:
    """
    Gets the data for the specified demo ID, which should be the hash of the demo, and round number.
    If no demo ID is specified, then a random demo is retrieved, if any exist.
    If no round number is specified, then the entire demo's dataset is returned. Note that round_num can only be specified if demo_id is specified.
    """
    print(f"get_demo_data(demo_id={demo_id}, round_num={round_num})")
    try:
        # Getting the Pandas DF containing the data
        demo_dataset = demo_coach_manager.get_demo_data(demo_id, round_num)

        # Convert DF into Arrow Table
        demo_dataset_table = pa.Table.from_pandas(demo_dataset)

        # Preparing a buffer to write the table into
        sink = pa.BufferOutputStream()

        # Creating and writing the table into an Arrow stream writer
        writer = ipc.new_stream(sink, demo_dataset_table.schema)
        writer.write_table(demo_dataset_table)
        writer.close()

        # Getting the raw bytes from the buffer and returning the binary stream
        buffer = sink.getvalue()
        return StreamingResponse(
            io.BytesIO(buffer.to_pybytes()),
            media_type="application/vnd.apache.arrow.stream",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch demo data: {str(e)}")


"""
====================================================================================
DemoIngestor activities
====================================================================================
"""


@app.post(f"/{DEMO_INGESTOR_ENDPOINT_PREFIX}/ingest_demo")
async def ingest_demo(file: UploadFile = File(...)) -> Dict:
    """
    Ingests the demo using the input file.

    The file will first be stored locally before calling this method. This method then passes that filepath into the manager for processing.
    """
    print(f"ingest_demo(file={file})")

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
        # Hash value is used to uniquely identify the file
        file_hash_value = DemoFileStore.get_file_hash(file_location)
        demo_ingestor_manager.ingest_demo(file_location, file_hash_value)
        return {MESSAGE_HEADER: "Demo ingested successfully", "fileName": file.filename, "fileId": file_hash_value}
    except Exception as e:
        return {ERROR_HEADER: f"Failed to ingest demo: {str(e)}"}
