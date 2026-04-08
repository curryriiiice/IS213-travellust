from typing import Dict
import logging
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config

logger = logging.getLogger(__name__)


class FlightSaveService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def save_flight(self, data: Dict) -> Dict:
        logger.info(f"📥 Received data in FlightSaveService: {data}")
        print(f"📥 Received data in FlightSaveService: {data}")

        flight_details = data.get('flight_details', {})
        flight_data = {
            **flight_details,
            'trip_id': data.get('trip_id'),
            'cost': data.get('cost')
        }

        logger.info(f"📤 Flight data to save to saved-flights: {flight_data}")
        logger.info(f"🔍 datetime_departure: {flight_data.get('datetime_departure')}, datetime_arrival: {flight_data.get('datetime_arrival')}")
        print(f"📤 Flight data to save to saved-flights: {flight_data}")
        print(f"🔍 Origin in flight_data: {flight_data.get('origin')}, Destination in flight_data: {flight_data.get('destination')}")
        return self.saved_flights_client.create_flight(flight_data)
