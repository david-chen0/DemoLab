import asyncio
import os
from demoparser2 import DemoParser
from fastapi import UploadFile
from backend.src.config.demo_parser_events import DemoParserEvents
from backend.src.DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager
from backend.src.api.backend_activities import *

def all_events_test(parser: DemoParser):
    # Get all available game events
    events = parser.list_game_events()

    print(f"Found {len(events)} available game events:")
    print("-" * 30)

    # Print each event name
    events.sort()
    for i, event in enumerate(events, 1):
        print(f"{i:2d}. {event}")

    print("-" * 30)
    print(f"Total events: {len(events)}")
    
    # Parsing specific events
    print("Parsing all the events")
    parsed_events = parser.parse_events(DemoParserEvents.get_all())
    print(f"Parsed events: {parsed_events}")


def parse_event_test(parser: DemoParser, event: str):
    event_result = parser.parse_event(event)

    print(f"Found {event} event")
    print(f"Event {event} information:")
    print(event_result)


def list_updated_fields_test(parser: DemoParser):
    result = parser.list_updated_fields()

    print(f"Found updated fields for demo: {result}")
    
    
def metadata_test(parser: DemoParser):
    header = parser.parse_header()
    print(f"Header: {header}")
    
    player_info = parser.parse_player_info()
    print(f"Player info: {player_info}")


async def main():
    # Path to the demo file
    # demo_path = "example_demos/spirit-vs-faze-m3-dust2.dem"
    demo_path = "example_demos/spirit-vs-mouz-m1-mirage.dem"

    # Check if demo file exists
    if not os.path.exists(demo_path):
        print(f"Error: Demo file '{demo_path}' not found!")
        print("Please ensure the demo file is in the project root directory.")
        return

    print(f"Parsing demo file: {demo_path}")
    print("=" * 50)

    # Initialize the parser
    parser = DemoParser(demo_path)
    
    # metadata_test(parser)
    all_events_test(parser)
    # parse_event_test(parser, DemoParserEvents.BEGIN_NEW_MATCH.value)
    # parse_event_test(parser, DemoParserEvents.ROUND_END.value)
    # list_updated_fields_test(parser)
    # parse_header_test(parser)
    
    # # testing the APIs
    # # THIS WILL END UP DELETING THE FILE NOW THAT THAT LOGIC WAS ADDED IN, CAREFUL
    # with open(demo_path, "rb") as f:
    #     # wrapping it in a FastAPI UploadFile
    #     upload = UploadFile(filename=demo_path, file=f)
        
    #     # testing demo ingestion
    #     await ingest_demo(upload)


if __name__ == "__main__":
    asyncio.run(main())
