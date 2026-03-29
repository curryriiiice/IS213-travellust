"""Business logic for hotel save orchestration in plan service."""

from typing import Dict, Any
from ..clients.hotel_management_client import HotelManagementClient
from ..clients.trips_client import TripsClient
from ..utils.api_errors import ValidationError
from ..clients.redis_client import publish_event


class HotelPlanService:
    """Service for orchestrating hotel save operations across multiple services."""

    def __init__(self):
        """Initialize service with required clients."""
        self.hotel_client = HotelManagementClient()
        self.trips_client = TripsClient()

    def save_hotel(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Orchestrate hotel save operation.

        This method coordinates:
        1. Validates required fields
        2. Validates trip exists
        3. Calls hotel-management to search and save hotel
        4. Extracts hotel_id from response
        5. Updates trips table with new hotel_id

        Args:
            data: Dictionary with hotel save request data
                Required: query, check_in_date, check_out_date, trip_id
                Optional: adults, children, currency, gl, hl, sort_by, rating, save_to_database

        Returns:
            Dictionary containing:
                - hotel: Saved hotel data
                - trip: Updated trip data with hotel_id appended

        Raises:
            ValidationError: If required fields are missing
            NotFoundError: If trip_id doesn't exist
            ServiceUnavailableError: If downstream services are unavailable
            InternalServerError: If downstream services return errors
        """
        # Step 1: Validate required fields
        self._validate_required_fields(data)

        trip_id = data.get("trip_id")

        # Step 2: Validate trip exists
        self.trips_client.get_trip(trip_id)

        # Step 3: Call hotel-management service to search and save hotel
        hotel_response = self.hotel_client.search_and_save_hotel(data)

        # Step 4: Extract hotel_id from nested response structure
        # Response structure: {"data": {"saved_hotel": {"hotel_id": "..."}}}
        hotel_id = self._extract_hotel_id(hotel_response)

        # Step 5: Update trips table with hotel_id
        updated_trip = self.trips_client.append_hotel_id(trip_id, hotel_id)

        # publish event (updated trip to redis)
        publish_event(trip_id, "HOTEL_ADDED", hotel_response.get("data", {}).get("saved_hotel", {}),
                      user_id=data.get("user_id"))

        # Step 6: Return combined response
        return {
            "hotel": hotel_response.get("data", {}).get("saved_hotel", {}),
            "trip": updated_trip,
        }

    def _validate_required_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields are present.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If any required field is missing
        """
        required_fields = ["query", "check_in_date", "check_out_date", "trip_id"]

        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

    def _extract_hotel_id(self, hotel_response: Dict[str, Any]) -> str:
        """
        Extract hotel_id from hotel-management service response.

        Args:
            hotel_response: Response from hotel-management service

        Returns:
            Hotel UUID string

        Raises:
            InternalServerError: If hotel_id cannot be extracted from response
        """
        try:
            # Response path: data -> saved_hotel -> hotel_id
            data = hotel_response.get("data", {})
            saved_hotel = data.get("saved_hotel", {})
            hotel_id = saved_hotel.get("hotel_id")

            if not hotel_id:
                raise ValueError("hotel_id not found in response")

            return hotel_id

        except (KeyError, AttributeError, ValueError) as e:
            from ..utils.api_errors import InternalServerError

            raise InternalServerError(
                f"Failed to extract hotel_id from hotel service response: {str(e)}"
            )
