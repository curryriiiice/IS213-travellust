"""Business logic for flight planning operations"""

import logging
import requests
from typing import Dict, Any
from ..clients.flight_management_client import FlightManagementClient
from ..clients.trips_client import TripsClient
from ..clients.redis_client import publish_event
from ..config import Config
from ..utils.api_errors import (
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    ExternalServiceError,
)

# Configure logging
logger = logging.getLogger(__name__)


class FlightPlanService:
    """Service for orchestrating flight operations across multiple services."""

    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.flight_mgmt_client = FlightManagementClient(config)
        self.trips_client = TripsClient()
        self.config = config

    def search_flights(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search for flights without saving (preview mode).

        This method passes search parameters directly to flight-management
        service which calls flight-search-wrapper.

        Args:
            data: Dictionary with flight search request data
                Required: origin, destination, departure_date
                Optional: return_date, adults, children, cabin_class, currency

        Returns:
            Dictionary containing search results from flight API

        Raises:
            ValidationError: If required fields are missing
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        required_fields = ["origin", "destination", "datetime_departure"]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

        # Step 2: Call flight-management search endpoint
        search_result = self.flight_mgmt_client.search_flights(data)

        return search_result

    def save_flight(self, data: Dict[str, Any]) -> str:
        """
        Save a flight and update trip metadata.

        This method coordinates:
        1. Validates required fields
        2. Validates trip exists
        3. Calls flight-management to save flight
        4. Updates trips.flight_ids array (CRITICAL FIX)
        5. Fetches full flight data
        6. Publishes FLIGHT_ADDED event to Redis

        Args:
            data: Flight data with all required fields
                Required: trip_id, user_id, flight_number, airline,
                         datetime_departure, datetime_arrival, cost
                Optional: origin, destination, external_link, aircraft_type,
                         legroom, co2_kg

        Returns:
            flight_id (str) - UUID string

        Raises:
            ValidationError: If required fields are missing
            NotFoundError: If trip doesn't exist
            ExternalServiceError: If downstream service fails
        """
        # Step 1: Validate required fields
        self._validate_save_fields(data)

        trip_id = data.get("trip_id")
        user_id = data.get("user_id")

        # Step 2: Validate trip exists
        self.trips_client.get_trip(trip_id)

        # Step 3: Call flight-management service to save flight
        flight_id = self.flight_mgmt_client.save_flight(data)

        # Step 4: Update trip's flight_ids array (CRITICAL FIX)
        try:
            self.trips_client.append_flight_id(trip_id, str(flight_id))
        except Exception as e:
            logger.error(f"Failed to update trip flight_ids: {str(e)}")
            raise ExternalServiceError(
                f"Flight saved but failed to update trip metadata: {str(e)}"
            )

        # Step 5: Fetch full flight data for Redis event
        flight_data = self._fetch_flight_from_flight_management(flight_id)

        # Step 6: Publish FLIGHT_ADDED event to Redis
        # Log error if publish fails, but don't fail the operation
        try:
            publish_event(
                trip_id=trip_id,
                event_type="FLIGHT_ADDED",
                data=flight_data,  # Full flight data
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - save is more critical than notification
            logger.error(f"Failed to publish FLIGHT_ADDED event to Redis: {str(e)}")

        return flight_id

    def update_flight(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing flight.

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to trip (member_ids check)
        3. Calls flight-management to update flight
        4. Publishes FLIGHT_UPDATED event to Redis

        Args:
            data: Dictionary with flight update request data
                Required: flight_id, trip_id, user_id
                Optional: any flight fields to update

        Returns:
            Dictionary containing updated flight data

        Raises:
            ValidationError: If required fields are missing
            UnauthorizedError: If user_id not in trip's member_ids
            NotFoundError: If trip or flight doesn't exist
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        self._validate_update_fields(data)

        flight_id = data.get("flight_id")
        trip_id = data.get("trip_id")
        user_id = data.get("user_id")

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Call flight-management service to update flight
        updated_flight = self.flight_mgmt_client.update_flight(data)

        # Step 4: Publish FLIGHT_UPDATED event to Redis
        # Log error if publish fails, but don't fail the operation
        try:
            publish_event(
                trip_id=trip_id,
                event_type="FLIGHT_UPDATED",
                data=updated_flight,  # Full updated flight data
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - update is more critical than notification
            logger.error(f"Failed to publish FLIGHT_UPDATED event to Redis: {str(e)}")

        return updated_flight

    def delete_flight(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Soft delete a flight.

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to trip (member_ids check)
        3. Fetches full flight data before deletion (for Redis event)
        4. Calls flight-management to delete flight
        5. Publishes FLIGHT_DELETED event to Redis

        Args:
            data: Dictionary with flight delete request data
                Required: flight_id, trip_id, user_id

        Returns:
            Dictionary containing:
                - deleted_flight: Full flight data before deletion
                - message: Confirmation message

        Raises:
            ValidationError: If required fields are missing
            UnauthorizedError: If user_id not in trip's member_ids
            NotFoundError: If trip or flight doesn't exist
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        self._validate_delete_fields(data)

        flight_id = data.get("flight_id")
        trip_id = data.get("trip_id")
        user_id = data.get("user_id")

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Fetch full flight data before deletion (for Redis event)
        flight_data = self._fetch_flight_from_flight_management(flight_id)

        # Step 4: Call flight-management service to delete flight
        self.flight_mgmt_client.delete_flight(str(flight_id))

        # Step 5: Publish FLIGHT_DELETED event to Redis
        # Log error if publish fails, but don't fail the operation
        try:
            publish_event(
                trip_id=trip_id,
                event_type="FLIGHT_DELETED",
                data={
                    "flight_id": flight_id,
                    "deleted_flight": flight_data,  # Full flight data
                },
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - deletion is more critical than notification
            logger.error(f"Failed to publish FLIGHT_DELETED event to Redis: {str(e)}")

        return {
            "deleted_flight": flight_data,
            "message": "Flight deleted successfully",
        }

    def _fetch_flight_from_flight_management(self, flight_id: str) -> Dict[str, Any]:
        """
        Fetch full flight data from flight-management service.

        This is a direct HTTP call (no client method) to get flight details.

        Args:
            flight_id: Flight ID to fetch (UUID string)

        Returns:
            Dictionary with flight data

        Raises:
            NotFoundError: If flight not found
            ExternalServiceError: If request fails
        """
        base_url = f"http://{self.config.FLIGHT_MANAGEMENT_HOST}:{self.config.FLIGHT_MANAGEMENT_PORT}"
        url = f"{base_url}/api/flights/{flight_id}"

        try:
            response = requests.get(url, timeout=self.config.REQUEST_TIMEOUT)

            if response.status_code == 404:
                raise NotFoundError(f"Flight with ID {flight_id} not found")

            response.raise_for_status()

            result = response.json()
            if result.get("success"):
                return result.get("data", {})
            else:
                raise ExternalServiceError(
                    f"Failed to fetch flight: {result.get('error', 'Unknown error')}"
                )

        except requests.Timeout:
            raise ExternalServiceError(
                "Request to flight-management timed out", status_code=504
            )
        except requests.RequestException as e:
            raise ExternalServiceError(
                f"Error connecting to flight-management: {str(e)}", status_code=503
            )

    def _validate_save_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields for save are present.

        Args:
            data: Request data dictionary with nested structure:
                {
                    "flight_details": {
                        "flight_number": ...,
                        "airline": ...,
                        "datetime_departure": ...,
                        "datetime_arrival": ...
                    },
                    "trip_id": ...,
                    "user_id": ...,
                    "cost": ...
                }

        Raises:
            ValidationError: If any required field is missing
        """
        # Check top-level fields
        required_top_fields = ["trip_id", "user_id", "cost", "flight_details"]
        for field in required_top_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

        # Check flight_details is a dict
        flight_details = data.get("flight_details")
        if not isinstance(flight_details, dict):
            raise ValidationError("flight_details must be an object")

        # Check required fields in flight_details
        required_flight_fields = [
            "flight_number",
            "airline",
            "datetime_departure",
            "datetime_arrival",
        ]
        for field in required_flight_fields:
            if not flight_details.get(field):
                raise ValidationError(
                    f"Missing required field in flight_details: {field}"
                )

    def _validate_update_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields for update are present.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If any required field is missing
        """
        required_fields = ["flight_id", "trip_id", "user_id"]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

    def _validate_delete_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate that all required fields for deletion are present.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If any required field is missing
        """
        required_fields = ["flight_id", "trip_id", "user_id"]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Missing required field: {field}")

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
