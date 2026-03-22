from typing import List, Dict
from ..clients.search_wrapper_client import SearchWrapperClient
from ..config import Config


class FlightSearchService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.search_client = SearchWrapperClient(config)

    def search_flights(self, origin: str, destination: str,
                      datetime_departure: str, datetime_arrival: str) -> Dict:
        """
        Search flights by orchestrating with flight-search-wrapper
        Returns the full response from flight-search-wrapper
        """
        return self.search_client.search_flights(
            origin=origin,
            destination=destination,
            datetime_departure=datetime_departure,
            datetime_arrival=datetime_arrival
        )
