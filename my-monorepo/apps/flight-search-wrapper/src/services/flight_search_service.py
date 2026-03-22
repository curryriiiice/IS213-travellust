from typing import List
from ..flightapi_client import FlightAPIClient
from ..models import Flight


class FlightSearchService:
    def __init__(self, config=None):
        from ..config import Config
        self.config = config or Config()
        self.client = FlightAPIClient(self.config)

    def search_flights(self, origin: str, destination: str,
                      datetime_departure: str,
                      datetime_arrival: str) -> List[Flight]:
        """
        Search flights by origin, destination and dates
        Returns list of Flight objects
        """
        flight_data = self.client.search_flights(
            origin=origin,
            destination=destination,
            departure_date=datetime_departure,
            return_date=datetime_arrival
        )

        return [Flight(**data) for data in flight_data]
