import requests
from typing import Dict
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class FlightsClient:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.base_url = f"http://{config.FLIGHTS_HOST}:{config.FLIGHTS_PORT}"

    def get_flight(self, flight_id: str) -> Dict:
        """
        Call flight-management service to get flight details
        Returns flight data
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/flights/{flight_id}",
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            if result.get('success'):
                return result['data']
            else:
                raise ExternalServiceError(f"Flights error: {result.get('error', 'Unknown error')}")
        except requests.Timeout:
            raise ExternalServiceError("Request to flight-management timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to flight-management: {str(e)}")
