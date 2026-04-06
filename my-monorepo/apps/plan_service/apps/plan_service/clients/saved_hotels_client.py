"""HTTP Client for Saved Hotels Service."""

import requests
from typing import Dict, Any, Optional
from ..config import Config
from ..utils.api_errors import (
    ServiceUnavailableError,
    InternalServerError,
    NotFoundError,
)


class SavedHotelsClient:
    """Client for communicating with the saved-hotels service."""

    def __init__(self):
        """Initialize the Saved Hotels client with service URL."""
        self.base_url = "http://saved-hotels:5000"
        self.timeout = Config.REQUEST_TIMEOUT

    def get_hotel(self, hotel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single hotel by ID.

        Args:
            hotel_id: UUID of the hotel

        Returns:
            Dictionary containing hotel data or None if not found

        Raises:
            NotFoundError: If hotel is not found
            ServiceUnavailableError: If saved-hotels service is unavailable
            InternalServerError: If saved-hotels service returns an error
        """
        url = f"{self.base_url}/api/hotels/{hotel_id}"

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(f"Hotel not found: {hotel_id}")

            if response.status_code == 500:
                error_data = response.json()
                error_message = error_data.get(
                    "error", "Unknown error from saved-hotels service"
                )
                raise InternalServerError(
                    f"Saved hotels service error: {error_message}"
                )

            if response.status_code != 200:
                raise InternalServerError(
                    f"Saved hotels service returned status {response.status_code}: {response.text}"
                )

            response_data = response.json()
            return response_data.get("data")

        except NotFoundError:
            raise
        except requests.exceptions.ConnectionError as e:
            raise ServiceUnavailableError(
                f"Could not connect to saved-hotels service at {self.base_url}: {str(e)}"
            )
        except requests.exceptions.Timeout as e:
            raise ServiceUnavailableError(
                f"Saved hotels service request timed out after {self.timeout}s: {str(e)}"
            )
        except requests.exceptions.RequestException as e:
            raise ServiceUnavailableError(
                f"Error communicating with saved-hotels service: {str(e)}"
            )
