from manager.demo_ingestor_manager import DemoIngestorManager

class DemoIngestorActivities():
    """
    Contains the APIs needed for communicating with and using DemoIngestor
    """
    demo_ingestor_manager: DemoIngestorManager
    
    def __init__(self):
        self.demo_ingestor_manager = DemoIngestorManager()
    
    # TODO: make this into an actual API
    def ingest_demo(self, filepath):
        """
        API to ingest a demo
        """
        self.demo_ingestor_manager.ingest_demo(filepath)
    
