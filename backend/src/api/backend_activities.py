from dotenv import load_dotenv
import os
import pyarrow as pa
import pyarrow.ipc as ipc
from fastapi import FastAPI, File, HTTPException, UploadFile, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional, Tuple
from ..DemoCoach.manager.demo_coach_manager import DemoCoachManager
from ..DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager
from ..util.demo_file_store import DemoFileStore
from ..util.logging import logger

# Environment variables
load_dotenv()
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(',')

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
    # React dev server
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global logic
# Makes the uploaded demos dir if it doesn't already exist
os.makedirs(UPLOADED_DEMOS_DIR, exist_ok=True)
os.makedirs(DemoFileStore.DEMO_DIRECTORY, exist_ok=True)
os.makedirs(DemoFileStore.METADATA_DIRECTORY, exist_ok=True)

"""
====================================================================================
DemoCoach activities
====================================================================================
"""

@app.get(f"/{DEMO_COACH_ENDPOINT_PREFIX}/get_metadata")
async def get_metadata(demo_id: str) -> Dict:
    """
    Gets the metadata for the demo corresponding to the provided ID
    """
    logger.info(f"get_metadata(demo_id={demo_id})")
    try:
        metadata = demo_coach_manager.get_metadata(demo_id)
        return {MESSAGE_HEADER: f"Found metadata for demo with ID {demo_id}", "metadata": metadata}
    except Exception as e:
        return {ERROR_HEADER: f"Failed to find metadata for demo with ID {demo_id}: {str(e)}"}


# TODO: just get these methods working first, then figure out where to store this
TICKS_PER_CHUNK = 20 # Indicates how many ticks we want to store per chunk
def _chunk_by_num_ticks(table: pa.Table, start_tick: int, end_tick: int) -> List[Tuple[int, int, Optional[int], Optional[int]]]:
    """
    Chunks the input table by TICKS_PER_CHUNKS ticks per chunk.
    
    It is the caller's responsibility to provide the start and end tick(ex: start and end tick of a round), as it's possible for the table to not have any data for some ticks, 
    so the start and end ticks being provided by the caller makes synchronization easier.
    
    :param table: The Arrow table to chunk by tick
    :type table: pa.Table
    :param start_tick: The first tick(inclusive) of the interval
    :type start_tick: int
    :param end_tick: The last tick(inclusive) of the interval
    :type end_tick: int
    :return: The list of row indexes in the table for each tick chunk, formatted as a (first_tick, last_tick, first_row, last_row) tuple.
    If there is no data for this chunk, then first_row and last_row will be None.
    :rtype: List[Tuple[int, int, Optional[int], Optional[int]]]
    """
    
    tick_chunks = [] # Stores the (first_tick, last_tick, first_row, last_row) for each tick chunk. If no data is present for a tick range, first_row and last_row will be None.
    cur_chunk_start_row = 0
    cur_first_tick = start_tick
    cur_last_tick = min(start_tick - 1 + TICKS_PER_CHUNK, end_tick) # The tick which will cut this one off at
    
    ticks = table["tick"].to_pylist()
    total_num_rows = len(ticks)
    for i in range(total_num_rows):
        tick = ticks[i]
        # While loop is needed to handle cases where no data is present for multiple ticks
        while tick >= cur_last_tick:
            if i == cur_chunk_start_row: # This tick chunk has no data, so we append an empty tuple
                tick_chunks.append((cur_first_tick, cur_last_tick, None, None))
            else: # Tick chunk ended at the previous tick
                tick_chunks.append((cur_first_tick, cur_last_tick, cur_chunk_start_row, i - 1))
                
            if cur_last_tick == end_tick: # We've processed the last tick in our request
                return tick_chunks
                
            cur_chunk_start_row = i
            cur_first_tick = cur_last_tick + 1 # Starting at the tick after the previous last
            cur_last_tick = min(cur_last_tick + TICKS_PER_CHUNK, end_tick)
            
    # No more tick data left, but we still haven't reached the end tick yet
    while cur_last_tick <= end_tick:
        if cur_chunk_start_row < total_num_rows - 1: # We still have some data in our current chunk
            tick_chunks.append((cur_first_tick, cur_last_tick, cur_chunk_start_row, total_num_rows - 1))
            cur_chunk_start_row = total_num_rows - 1
        else: # No data for this chunk
            tick_chunks.append((cur_first_tick, cur_last_tick, None, None))
            
        cur_first_tick = cur_last_tick + 1
        cur_last_tick = min(cur_last_tick + TICKS_PER_CHUNK, end_tick)
            
    return tick_chunks
    

@app.get(f"/{DEMO_COACH_ENDPOINT_PREFIX}/stream_demo_datasets")
async def stream_datasets(demo_id: str, dataset_names: List[str] = Query(...), round_num: Optional[int] = None) -> StreamingResponse:
    """
    Gets the data for the specified demo ID, which should be the hash of the demo, and round number.
    If no round number is specified, then the entire demo's dataset is returned. Note that round_num can only be specified if demo_id is specified.
    
    args:
        demo_id: The ID of the demo to fetch
        dataset_names: The list of datasets to fetch the data for(ex: player_data)
        round_num: The round to fetch the data for
    """
    logger.info(f"stream_demo_datasets(dataset_names={dataset_names}, demo_id={demo_id}, round_num={round_num})")
    
    boundary = "arrowboundary123" # Used to mark the start of a new part/message
    try:
        # Getting the round metadata to get the start and end ticks for each round/game
        metadata = demo_coach_manager.get_metadata(demo_id)
        round_metadata = metadata["round_metadata"]
        
        # Start and end ticks for our demo game/round
        start_tick = None
        end_tick = None
        if round_num: # Start and end ticks of the round
            specific_round_metadata = round_metadata[str(round_num)]
            start_tick = specific_round_metadata["round_start"]
            end_tick = specific_round_metadata["round_end"]
        else: # Start and end ticks of the game
            num_rounds = metadata["num_rounds"]
            first_round_metadata = round_metadata["1"]
            last_round_metadata = round_metadata[str(num_rounds)]
            start_tick = first_round_metadata["round_start"]
            end_tick = last_round_metadata["round_end"]
        
        # TODO: FIGURE OUT IF THERE'S A BETTER/CLEANER WAY TO ORGANIZE THESE. JUST GET IT WORKING FIRST THO
        dataset_chunks = {} # Maps from dataset name to a list of chunk indexes
        datasets = {} # Maps from dataset name to actual dataset
        dataset_schemas = {} # Maps from dataset name to their schemas to avoid having to fetch schemas repeatedly
        for dataset in dataset_names:
            # Load the Pandas DF
            demo_dataset = demo_coach_manager.get_demo_data(dataset, demo_id, round_num)
        
            # Convert DF into Arrow Table
            demo_dataset_table: pa.Table = pa.Table.from_pandas(demo_dataset)
            
            # Storing the chunks, table, and schema
            dataset_chunks[dataset] = _chunk_by_num_ticks(demo_dataset_table, start_tick, end_tick)
            datasets[dataset] = demo_dataset_table
            dataset_schemas[dataset] = demo_dataset_table.schema
            
        # Verifying that all datasets have the same amount of chunks
        num_chunks = -1
        for dataset_chunk in dataset_chunks.values():
            if num_chunks == -1:
                num_chunks = len(dataset_chunk)
            elif len(dataset_chunk) != num_chunks:
                raise ValueError("Datasets have different amount of chunks when they are expected to have the same amount.")
        
        # FastAPI's StreamingResponse requires a callable/iterator that produces bytes to be passed back, so we make a helper method for this
        async def generate_data():
            for chunk_idx in range(num_chunks):
                # For each dataset
                for dataset_name in dataset_names:
                    first_tick, last_tick, first_row, last_row = dataset_chunks[dataset_name][chunk_idx]
                    schema = dataset_schemas[dataset_name]
                    
                    # No rows in this chunk, so empty table using the known schema
                    if first_row is None or last_row is None:
                        cur_chunk = pa.Table.from_arrays(
                            [pa.array([], type=field.type) for field in schema],
                            schema=schema,
                        )
                    else:
                        table = datasets[dataset_name]
                        cur_chunk = table.slice(first_row, last_row + 1 - first_row) # Slices based on length
                        
                    # Preparing a buffer to write the chunk into
                    sink = pa.BufferOutputStream()
                    
                    # Creating an Arrow stream writer to write the chunk into
                    # This uses the table's schema to creater the IPC stream, which is why we can decode directly without schema knowledge in the frontend
                    writer = ipc.new_stream(sink, schema)
                    writer.write_table(cur_chunk)
                    writer.close()
                    arrow_bytes = sink.getvalue().to_pybytes()
            
                    # "media_type="application/vnd.apache.arrow.stream"" indicates that we are sending an Arrow stream
                    headers = (
                        f"--{boundary}--\r\n"
                        "Content-Type: application/vnd.apache.arrow.stream\r\n"
                        "X-Message-Type: data\r\n"
                        f"X-Dataset-Id: {dataset_name}\r\n"
                        f"X-Window-Index: {chunk_idx}\r\n"
                        f"X-Tick-Start: {first_tick}\r\n"
                        f"X-Tick-End: {last_tick}\r\n\r\n"
                    )
                    
                    # Sending the headers, bytes, and mandatory blank line
                    yield headers.encode("utf-8") + arrow_bytes + b"\r\n"
                    
            # Boundary tells the client that there's nothing left in this message
            yield f"--{boundary}--".encode("utf-8")
        
        # media_type field sets the HTTP "Content-Type" header, which tells the client how to interpret the stream, independent of Arrow
        # multipart/mixed tells the client that this response contains multiple parts, each w/ its own headers and content type
        return StreamingResponse(
            generate_data(),
            media_type=f"multipart/mixed; boundary={boundary}",
        )
    except Exception as e:
        error_str = f"Failed to fetch demo data: {str(e)}"
        logger.error(error_str)
        raise HTTPException(
            status_code=500, detail=error_str)


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
    logger.info(f"ingest_demo(file={file})")

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
        return {MESSAGE_HEADER: "Demo ingested successfully", "fileName": file.filename, "demoId": file_hash_value}
    except Exception as e:
        return {ERROR_HEADER: f"Failed to ingest demo: {str(e)}"}
