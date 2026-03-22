from typing import Dict
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightGetService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def get_flight(self, flight_id: str) -> Dict:
        """
        Get flight details by orchestrating with saved-flights
        Returns flight data
        """
        return self.saved_flights_client.get_flight(flight_id)