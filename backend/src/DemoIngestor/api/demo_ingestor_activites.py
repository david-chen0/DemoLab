from manager.demo_ingestor_manager import *

demo_ingestor_manager = DemoIngestorManager()

# todo: these are just called APIs right now but they haven't actually been connected yet, connect them once ready
def ingest_demo(filepath: str):
    """
    Runs a provided demo through the entire ingestion workflow, which includes pre-processing the
    demo and storing the pre-processed demo and its metadata.

    @param path: String representing the local filepath of the demo, this is just temporary
    """
    # todo: for now we'll just use a local filepath for this
    # figure out how we want users to pass in a demo, maybe we just need to take the entire
    # demo as an input to this?

    # call the manager
    demo_ingestor_manager.ingest_demo(filepath)
