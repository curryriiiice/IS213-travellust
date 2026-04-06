"""Business logic for hotel save orchestration in plan service."""

import logging
from typing import Dict, Any
from ..clients.hotel_management_client import HotelManagementClient
from ..clients.trips_client import TripsClient
from ..utils.api_errors import ValidationError, UnauthorizedError, NotFoundError
from ..clients.redis_client import publish_event

# Configure logging
logger = logging.getLogger(__name__)


class HotelPlanService:
    """Service for orchestrating hotel save operations across multiple services."""

    def __init__(self):
        """Initialize service with required clients."""
        self.hotel_client = HotelManagementClient()
        self.trips_client = TripsClient()

    def search_hotels(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search for hotels without saving (preview mode).

        This method passes search parameters directly to hotel-management
        service which calls hotel-search-wrapper.

        Args:
            data: Dictionary with hotel search request data
                Required: query (or city), check_in_date, check_out_date
                Optional: adults, children, currency, hl, sort_by, rating

        Returns:
            Dictionary containing:
                - search_results: Raw search results from hotel API
                - status: "success" or "error"

        Raises:
            ValidationError: If required fields are missing
            ServiceUnavailableError: If downstream services are unavailable
            InternalServerError: If downstream services return errors
        """
        # Step 1: Validate required fields
        if not data.get("query") and not data.get("city"):
            raise ValidationError("Missing required field: query or city")

        required_fields = ["check_in_date", "check_out_date"]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

        # Step 2: Call hotel-management search endpoint
        search_result = self.hotel_client.search_hotels(data)

        return search_result

    def save_hotel(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save a pre-selected hotel to database and update trip.

        This method coordinates:
        1. Validates required fields
        2. Validates trip exists
        3. Calls hotel-management to save hotel (which updates trip.hotel_ids internally)
        4. Publishes HOTEL_ADDED event to Redis

        Args:
            data: Dictionary with hotel save request data
                Required: user_id, trip_id, hotel (object)
                hotel object must contain: name, check_in_date, check_out_date
                Optional in hotel: description, external_link, link, overall_rating,
                                  rate_per_night, lat, long, amenities, photos, address

        Returns:
            Dictionary containing:
                - hotel: Saved hotel data with hotel_id
                - trip: Updated trip data (hotel_ids array updated by hotel-management)

        Raises:
            ValidationError: If required fields are missing
            NotFoundError: If trip doesn't exist
            ServiceUnavailableError: If downstream services are unavailable
            InternalServerError: If downstream services return errors
        """
        # Step 1: Validate required fields
        self._validate_save_fields(data)

        user_id = data.get("user_id")
        trip_id = data.get("trip_id")
        hotel_data = data.get("hotel")

        # Step 2: Validate trip exists
        self.trips_client.get_trip(trip_id)

        # Step 3: Call hotel-management service to save hotel
        # Hotel-management internally:
        #   - Saves to saved-hotels service
        #   - Updates trips.hotel_ids array
        save_response = self.hotel_client.save_hotel(
            user_id=user_id, trip_id=trip_id, hotel_data=hotel_data
        )

        # Extract saved hotel from response
        saved_hotel = save_response.get("saved_hotel", {})

        # Step 4: Publish HOTEL_ADDED event to Redis
        # Publish AFTER trip is updated (hotel-management does this before returning)
        # Log error if publish fails, but don't fail the operation
        try:
            publish_event(
                trip_id=trip_id,
                event_type="HOTEL_ADDED",
                data=saved_hotel,  # Full hotel data
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - save is more critical than notification
            logger.error(f"Failed to publish HOTEL_ADDED event to Redis: {str(e)}")

        # Step 5: Get updated trip to return
        updated_trip = self.trips_client.get_trip(trip_id)

        return {"hotel": saved_hotel, "trip": updated_trip}

    def _validate_save_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields for save are present.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If any required field is missing or invalid
        """
        # Check top-level fields
        if not data.get("user_id"):
            raise ValidationError("Missing required field: user_id")

        if not data.get("trip_id"):
            raise ValidationError("Missing required field: trip_id")

        if not data.get("hotel"):
            raise ValidationError("Missing required field: hotel")

        # Validate hotel is a dict
        hotel_data = data.get("hotel")
        if not isinstance(hotel_data, dict):
            raise ValidationError("hotel must be an object")

        # Check required fields in hotel object
        required_hotel_fields = ["name", "check_in_date", "check_out_date"]
        for field in required_hotel_fields:
            if not hotel_data.get(field):
                raise ValidationError(f"Missing required field in hotel: {field}")

    def delete_hotels(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Orchestrate hotel deletion operation.

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to the trip (member_ids check)
        3. Fetches full hotel data for each hotel (for Redis events)
        4. Calls hotel-management to delete hotels and update trip
        5. Publishes HOTEL_DELETED event to Redis (logs error if fails)

        Args:
            data: Dictionary with hotel delete request data
                Required: trip_id, hotel_ids (array), user_id
                Optional: none

        Returns:
            Dictionary containing:
                - deleted_hotels: List of deleted hotel data objects
                - trip: Updated trip data with hotel_ids removed
                - deleted_count: Number of hotels deleted

        Raises:
            ValidationError: If required fields are missing
            NotFoundError: If trip doesn't exist
            UnauthorizedError: If user_id not in trip's member_ids
            ServiceUnavailableError: If downstream services are unavailable
            InternalServerError: If downstream services return errors
        """
        # Step 1: Validate required fields
        self._validate_delete_fields(data)

        trip_id = data.get("trip_id")
        hotel_ids = data.get("hotel_ids")
        user_id = data.get("user_id")

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Fetch full hotel data for each hotel before deletion
        # This is needed for Redis events (Option B - full hotel data)
        # Continue with remaining hotels if one doesn't exist
        from ..clients.saved_hotels_client import SavedHotelsClient

        saved_hotels_client = SavedHotelsClient()

        deleted_hotels = []
        for hotel_id in hotel_ids:
            try:
                hotel_data = saved_hotels_client.get_hotel(hotel_id)
                if hotel_data:
                    deleted_hotels.append(hotel_data)
            except NotFoundError:
                # Hotel doesn't exist - skip it but continue with others
                # This is not an error condition (hotel may have been deleted already)
                pass

        # Step 4: Call hotel-management service to delete hotels and update trip
        delete_response = self.hotel_client.delete_hotels(trip_id, hotel_ids)

        # Step 5: Publish HOTEL_DELETED event to Redis
        # Log error if publish fails, but don't fail the operation
        try:
            publish_event(
                trip_id=trip_id,
                event_type="HOTEL_DELETED",
                data={
                    "hotel_ids": hotel_ids,
                    "deleted_hotels": deleted_hotels,  # Full hotel data
                },
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - deletion is more critical than notification
            logger.error(f"Failed to publish HOTEL_DELETED event to Redis: {str(e)}")

        # Step 6: Return combined response
        return {
            "deleted_hotels": deleted_hotels,
            "trip": delete_response.get("updated_trip", {}),
            "deleted_count": delete_response.get("deleted_count", 0),
            "message": "Hotels deleted successfully",
        }

    def _validate_delete_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields for deletion are present.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If any required field is missing or invalid
        """
        # Check trip_id
        if not data.get("trip_id"):
            raise ValidationError("Missing required field: trip_id")

        # Check hotel_ids
        if not data.get("hotel_ids"):
            raise ValidationError("Missing required field: hotel_ids")

        # Check user_id (REQUIRED for authorization)
        if not data.get("user_id"):
            raise ValidationError("Missing required field: user_id")

        # Validate hotel_ids is a list
        if not isinstance(data.get("hotel_ids"), list):
            raise ValidationError("hotel_ids must be an array")

        # Validate hotel_ids is not empty
        if len(data.get("hotel_ids")) == 0:
            raise ValidationError("hotel_ids array cannot be empty")

    def _validate_user_access(self, trip: Dict[str, Any], user_id: str) -> None:
        """
        Validate that user_id has access to the trip.

        Args:
            trip: Trip data dictionary
            user_id: User UUID to validate

        Raises:
            UnauthorizedError: If user_id is not in trip's member_ids array
        """
        member_ids = trip.get("member_ids", [])

        if not isinstance(member_ids, list):
            member_ids = []

        if user_id not in member_ids:
            raise UnauthorizedError(
                f"User {user_id} does not have access to trip {trip.get('id')}"
            )
