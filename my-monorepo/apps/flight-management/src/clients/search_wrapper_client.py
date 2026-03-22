import requests
from typing import List, Dict
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class SearchWrapperClient:
    def __init__(self, config: Config):
        self.base_url = f"http://{config.SEARCH_WRAPPER_HOST}:{config.SEARCH_WRAPPER_PORT}"

    def search_flights(self, origin: str, destination: str,
                      datetime_departure: str, datetime_arrival: str) -> Dict:
        """
        Call flight-search-wrapper service
        Returns the full response from flight-search-wrapper
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights/search",
                json={
                    'origin': origin,
                    'destination': destination,
                    'datetime_departure': datetime_departure,
                    'datetime_arrival': datetime_arrival
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            if data.get('success'):
                return data
            else:
                raise ExternalServiceError(f"Search wrapper error: {data.get('error', 'Unknown error')}")
        except requests.Timeout:
            raise ExternalServiceError("Request to flight-search-wrapper timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to flight-search-wrapper: {str(e)}")
