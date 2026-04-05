from typing import Dict
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightSaveService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def save_flight(self, data: Dict) -> Dict:
        print(f"📥 Received data in FlightSaveService: {data}")
        flight_data = {
            **data.get('flight_details', {}),
            'trip_id': data.get('trip_id'),
            'cost': data.get('cost')
        }
        print(f"📤 Flight data to save to saved-flights: {flight_data}")
        print(f"🔍 Origin in flight_data: {flight_data.get('origin')}, Destination in flight_data: {flight_data.get('destination')}")
        return self.saved_flights_client.create_flight(flight_data)
