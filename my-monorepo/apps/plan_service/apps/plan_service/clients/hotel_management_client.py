"""HTTP Client for Hotel Management Service."""

import requests
from typing import Dict, Any
from ..config import Config
from ..utils.api_errors import ServiceUnavailableError, InternalServerError


class HotelManagementClient:
    """Client for communicating with the hotel-management service."""

    def __init__(self):
        """Initialize the Hotel Management client with service URL."""
        self.base_url = (
            f"http://{Config.HOTEL_MANAGEMENT_HOST}:{Config.HOTEL_MANAGEMENT_PORT}"
        )
        self.timeout = Config.REQUEST_TIMEOUT

    def search_and_save_hotel(self, hotel_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search for hotels and save the first result to database.

        This method calls the hotel-management service's /api/search-and-save endpoint
        which orchestrates:
        1. Searching for hotels via hotel-search-wrapper
        2. Transforming the search results
        3. Saving to database via saved-hotels service

        Args:
            hotel_data: Dictionary containing:
                - query (required): Search query for hotels
                - check_in_date (required): Check-in date (YYYY-MM-DD)
                - check_out_date (required): Check-out date (YYYY-MM-DD)
                - trip_id (required): Trip UUID
                - adults (optional): Number of adults (default: 2)
                - children (optional): Number of children (default: 0)
                - currency (optional): Currency code (default: "SGD")
                - gl (optional): Country code (default: "sg")
                - hl (optional): Language code (default: "en")
                - sort_by (optional): Sort option (3=price, 8=rating, 13=reviews)
                - rating (optional): Rating filter (7=3.5+, 8=4.0+, 9=4.5+)
                - save_to_database (optional): Whether to save (default: True)

        Returns:
            Dictionary containing:
                - data: Response data with search_results, transformed_hotel, saved_hotel
                - status: Operation status

        Raises:
            ServiceUnavailableError: If hotel-management service is unavailable
            InternalServerError: If hotel-management service returns an error
        """
        url = f"{self.base_url}/api/search-and-save"

        try:
            response = requests.post(url, json=hotel_data, timeout=self.timeout)

            # Check if the response indicates an error from hotel-management service
            if response.status_code == 500:
                error_data = response.json()
                error_message = error_data.get(
                    "error", "Unknown error from hotel service"
                )
                raise InternalServerError(
                    f"Hotel management service error: {error_message}"
                )

            if response.status_code == 400:
                error_data = response.json()
                error_message = error_data.get("error", "Invalid request")
                raise ValueError(f"Invalid hotel data: {error_message}")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Hotel management service returned status {response.status_code}: {response.text}"
                )

            return response.json()

        except ValueError:
            # Re-raise validation errors
            raise
        except requests.exceptions.ConnectionError as e:
            raise ServiceUnavailableError(
                f"Could not connect to hotel management service at {self.base_url}: {str(e)}"
            )
        except requests.exceptions.Timeout as e:
            raise ServiceUnavailableError(
                f"Hotel management service request timed out after {self.timeout}s: {str(e)}"
            )
        except requests.exceptions.RequestException as e:
            raise ServiceUnavailableError(
                f"Error communicating with hotel management service: {str(e)}"
            )
