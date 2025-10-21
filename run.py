from demoparser2 import DemoParser
import os
from backend.src.config.demo_parser_events import DemoParserEvents
from backend.src.DemoIngestor.manager.demo_ingestor_manager import DemoIngestorManager


def demo_ingestor_manager_test(filepath: str):
    demo_ingestor_manager = DemoIngestorManager()
    demo_ingestor_manager.ingest_demo(filepath)


def list_game_events_test(parser: DemoParser):
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

    # Also show some basic demo info
    print("\nDemo Header Information:")
    print("-" * 30)
    header = parser.parse_header()
    for key, value in header.items():
        print(f"{key}: {value}")


def parse_event_test(parser: DemoParser, event: str):
    event_result = parser.parse_event(event)

    print(f"Found {event} event")
    print(f"Event {event} information:")
    print(event_result)


def main():
    # Path to the demo file
    demo_path = "spirit-vs-faze-m3-dust2.dem"

    # Check if demo file exists
    if not os.path.exists(demo_path):
        print(f"Error: Demo file '{demo_path}' not found!")
        print("Please ensure the demo file is in the project root directory.")
        return

    print(f"Parsing demo file: {demo_path}")
    print("=" * 50)
    
    # Testing the manager
    demo_ingestor_manager_test(demo_path)

    # # Initialize the parser
    # parser = DemoParser(demo_path)

    # list_game_events_test(parser)
    # parse_event_test(parser, DemoParserEvents.BEGIN_NEW_MATCH.value)
    # parse_event_test(parser, DemoParserEvents.ROUND_END.value)


if __name__ == "__main__":
    main()
