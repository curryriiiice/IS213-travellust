import requests
from typing import Dict
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class TripsClient:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.base_url = f"http://{config.TRIPS_HOST}:{config.TRIPS_PORT}"

    def get_trip(self, trip_id: str) -> Dict:
        """
        Call trips_atomic service to get trip details
        Returns trip data
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/trips/{trip_id}",
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            if 'data' in result:
                return result['data']
            elif 'error' in result:
                raise ExternalServiceError(f"Trips error: {result.get('error', 'Unknown error')}")
            else:
                raise ExternalServiceError("Trips error: Unknown error")
        except requests.Timeout:
            raise ExternalServiceError("Request to trips_atomic timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to trips_atomic: {str(e)}")
