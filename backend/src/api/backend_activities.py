from DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager

class BackendActivities:
    # WE'LL STORE ALL THE APIS HERE
    # DIVIDE IT BY SECTION, BUT EVERYTHING WILL BE HERE
    # WE'LL USE FASTAPI
    
    demo_ingestor_manager: DemoIngestorManager
    
    def __init__(self):
        self.demo_ingestor_manager = DemoIngestorManager()

    """
    ====================================================================================
    DemoIngestor activities
    ====================================================================================
    """
    
    # TODO: make this into an actual API
    def ingest_demo(self, filepath):
        """
        API to ingest a demo
        """
        self.demo_ingestor_manager.ingest_demo(filepath)
    
