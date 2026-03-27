from typing import Dict
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightDeleteService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)

    def delete_flight(self, data: Dict) -> Dict:
        """
        Soft delete a flight by calling saved-flights service
        Returns full response from saved-flights
        """
        flight_id = data.get('flight_id')
        return self.saved_flights_client.delete_flight(flight_id)
