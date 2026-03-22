from typing import Dict
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightSaveService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def save_flight(self, data: Dict) -> int:
        """
        Save flight by orchestrating with saved-flghts
        Returns flight_id
        """
        return self.saved_flights_client.create_flight(data)
