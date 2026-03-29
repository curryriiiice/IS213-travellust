import requests
from typing import Dict
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class FlightManagementClient:
    """HTTP client for flight-management service"""

    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.base_url = (
            f"http://{config.FLIGHT_MANAGEMENT_HOST}:{config.FLIGHT_MANAGEMENT_PORT}"
        )
        self.timeout = config.REQUEST_TIMEOUT

    def save_flight(self, data: Dict) -> int:
        """
        Call flight-management service to save a flight

        Args:
            data: Flight data dictionary with trip_id, user_id, flight details

        Returns:
            flight_id (int)

        Raises:
            ExternalServiceError: If request fails
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights/save", json=data, timeout=self.timeout
            )
            response.raise_for_status()

            result = response.json()
            if result.get("success"):
                return result["data"]["flight_id"]
            else:
                raise ExternalServiceError(
                    f"Flight management error: {result.get('error', 'Unknown error')}"
                )

        except requests.Timeout:
            raise ExternalServiceError(
                "Request to flight-management timed out", status_code=504
            )
        except requests.RequestException as e:
            raise ExternalServiceError(
                f"Error connecting to flight-management: {str(e)}", status_code=503
            )
