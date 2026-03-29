from typing import Dict
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightUpdateService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def update_flight(self, data: Dict) -> Dict:
        """
        Update a flight by calling saved-flights service
        Returns full response from saved-flights
        """
        # The data is already in the correct nested structure format
        return self.saved_flights_client.update_flight(data)
