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

    def save_flight(self, data: Dict) -> str:
        """
        Call flight-management service to save a flight

        Args:
            data: Flight data dictionary with trip_id, user_id, flight details

        Returns:
            flight_id (str) - UUID string

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

    def search_flights(self, data: Dict) -> Dict:
        """
        Search for flights via flight-management service (preview mode).

        Args:
            data: Flight search parameters dictionary
                Required: origin, destination, departure_date
                Optional: return_date, adults, children, cabin_class, currency

        Returns:
            Dictionary with search results from flight-search-wrapper

        Raises:
            ExternalServiceError: If request fails
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights/search", json=data, timeout=self.timeout
            )
            response.raise_for_status()

            result = response.json()
            if result.get("success"):
                return result.get("data", {})
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

    def update_flight(self, data: Dict) -> Dict:
        """
        Update an existing flight via flight-management service.

        Args:
            data: Flight update data dictionary
                Required: flight_id
                Optional: any flight fields to update (airline, datetime_departure, etc.)

        Returns:
            Dictionary with updated flight data

        Raises:
            ExternalServiceError: If request fails
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights/update", json=data, timeout=self.timeout
            )
            response.raise_for_status()

            result = response.json()
            if result.get("success"):
                return result.get("data", {})
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

    def delete_flight(self, flight_id: str) -> Dict:
        """
        Soft delete a flight via flight-management service.

        Args:
            flight_id: Flight ID to delete (string or int)

        Returns:
            Dictionary with deletion confirmation

        Raises:
            ExternalServiceError: If request fails
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/flights/delete",
                json={"flight_id": flight_id},
                timeout=self.timeout,
            )
            response.raise_for_status()

            result = response.json()
            # Handle response format: flight-management returns {'flight_id': id}
            # without a success wrapper on successful delete
            if "flight_id" in result:
                return result
            elif result.get("success"):
                return result.get("data", {})
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
