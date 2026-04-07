"""HTTP Client for Hotel Management Service."""

import requests
from typing import Dict, Any
from ..config import Config
from ..utils.api_errors import (
    ServiceUnavailableError,
    InternalServerError,
    ValidationError,
)


class HotelManagementClient:
    """Client for communicating with the hotel-management service."""

    def __init__(self):
        """Initialize the Hotel Management client with service URL."""
        self.base_url = (
            f"http://{Config.HOTEL_MANAGEMENT_HOST}:{Config.HOTEL_MANAGEMENT_PORT}"
        )
        self.timeout = Config.REQUEST_TIMEOUT

    def search_hotels(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search for hotels without saving to database (preview mode).

        Calls hotel-management's /api/search endpoint which queries
        hotel-search-wrapper for hotel results.

        Args:
            search_params: Dictionary containing:
                - query (required): Search query for hotels
                - check_in_date (required): Check-in date (YYYY-MM-DD)
                - check_out_date (required): Check-out date (YYYY-MM-DD)
                - adults (optional): Number of adults
                - children (optional): Number of children
                - currency (optional): Currency code
                - hl (optional): Language code
                - sort_by (optional): Sort option (3=price, 8=rating, 13=reviews)
                - rating (optional): Rating filter (7=3.5+, 8=4.0+, 9=4.5+)

        Returns:
            Dictionary containing:
                - search_results: Raw search results from hotel API
                - status: "success" or "error"

        Raises:
            ServiceUnavailableError: If hotel-management service is unavailable
            InternalServerError: If hotel-management service returns an error
        """
        url = f"{self.base_url}/api/search"

        try:
            response = requests.post(url, json=search_params, timeout=self.timeout)

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
                raise ValidationError(f"Invalid search parameters: {error_message}")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Hotel management service returned status {response.status_code}: {response.text}"
                )

            return response.json().get("data", {})

        except ValidationError:
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

    def save_hotel(
        self, user_id: str, trip_id: str, hotel_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save a pre-selected hotel to database.

        Calls hotel-management's /api/save-hotel endpoint which:
        1. Saves hotel to saved-hotels service
        2. Updates trips.hotel_ids array

        Args:
            user_id: User UUID (renamed from uid in hotel-management)
            trip_id: Trip UUID
            hotel_data: Hotel details (name, dates, rates, amenities, etc.)
                Required: name, check_in_date, check_out_date
                Optional: description, external_link, link, overall_rating,
                         rate_per_night, lat, long, amenities, photos, address

        Returns:
            Dictionary containing:
                - saved_hotel: Saved hotel data with hotel_id
                - uid: User ID
                - trip_id: Trip ID
                - status: "success"

        Raises:
            ServiceUnavailableError: If hotel-management service is unavailable
            InternalServerError: If hotel-management service returns an error
            ValueError: If validation fails (400 response)
        """
        url = f"{self.base_url}/api/save-hotel"

        # Map user_id to uid (hotel-management uses 'uid')
        payload = {"uid": user_id, "trip_id": trip_id, "hotel": hotel_data}

        try:
            response = requests.post(url, json=payload, timeout=self.timeout)

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
                raise ValidationError(f"Invalid hotel data: {error_message}")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Hotel management service returned status {response.status_code}: {response.text}"
                )

            return response.json().get("data", {})

        except ValidationError:
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

    def delete_hotels(self, trip_id: str, hotel_ids: list) -> Dict[str, Any]:
        """
        Delete hotels from a trip via hotel-management service.

        Calls hotel-management's /api/hotel/delete endpoint which:
        1. Removes hotel_ids from trip's hotel_ids array
        2. Soft deletes hotels in saved-hotels service

        Args:
            trip_id: UUID of the trip
            hotel_ids: List of hotel UUIDs to delete

        Returns:
            Dictionary containing:
                - updated_trip: Trip data with updated hotel_ids array
                - soft_deleted_hotels: List of deleted hotel IDs
                - deleted_count: Number of hotels deleted
                - status: "success"
                - message: Success message

        Raises:
            ServiceUnavailableError: If hotel-management service is unavailable
            InternalServerError: If hotel-management service returns an error
            ValueError: If validation fails (400 response)
        """
        url = f"{self.base_url}/api/hotel/delete"
        payload = {"trip_id": trip_id, "hotel_ids": hotel_ids}

        try:
            response = requests.post(url, json=payload, timeout=self.timeout)

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
                raise ValidationError(f"Invalid delete request: {error_message}")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Hotel management service returned status {response.status_code}: {response.text}"
                )

            return response.json().get("data", {})

        except ValidationError:
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
