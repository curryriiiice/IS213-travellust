import requests
from typing import List, Dict
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class SavedFlightsClient:
    def __init__(self, config: Config):
        self.base_url = f"http://{config.SAVED_FLIGHTS_HOST}:{config.SAVED_FLIGHTS_PORT}"

    def create_flight(self, data: Dict) -> int:
        """
        Call saved-flghts service to create flight
        Returns flight_id
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights",
                json=data,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            if result.get('success'):
                return result['data']['flight_id']
            else:
                raise ExternalServiceError(f"Saved flights error: {result.get('error', 'Unknown error')}")
        except requests.Timeout:
            raise ExternalServiceError("Request to saved-flghts timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to saved-flghts: {str(e)}")

    def get_flight(self, flight_id: int) -> Dict:
        """
        Call saved-flghts service to get flight details
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
                raise ExternalServiceError(f"Saved flights error: {result.get('error', 'Unknown error')}")
        except requests.Timeout:
            raise ExternalServiceError("Request to saved-flghts timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to saved-flghts: {str(e)}")
