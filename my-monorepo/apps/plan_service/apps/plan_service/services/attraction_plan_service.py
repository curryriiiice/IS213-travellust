"""Service layer for attraction planning operations."""

import logging
from typing import Dict, Any

from ..clients.attractions_client import AttractionsClient
from ..clients.trips_client import TripsClient
from ..clients.redis_client import publish_event
from ..utils.api_errors import ValidationError, UnauthorizedError

logger = logging.getLogger(__name__)


class AttractionPlanService:
    """
    Service for orchestrating attraction operations.

    This service coordinates:
    - User authorization (via trips service)
    - Attraction CRUD operations (via attractions service)
    - Real-time event publishing (via Redis)
    """

    def __init__(self):
        """Initialize service with required clients."""
        self.attractions_client = AttractionsClient()
        self.trips_client = TripsClient()

    def save_attraction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save an attraction to a trip (manual or from catalog).

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to trip (member_ids check)
        3. Routes to appropriate attractions service endpoint:
           - If catalog_attraction_id present: save from catalog
           - If name present: save manually
        4. Publishes ATTRACTION_ADDED event to Redis

        Args:
            data: Dictionary with attraction save request data
                Required: trip_id, user_id, attraction
                For manual mode: attraction.name (required), plus optional fields
                For catalog mode: attraction.catalog_attraction_id (required), plus optional overrides

        Returns:
            Dictionary containing created attraction data

        Raises:
            ValidationError: If required fields are missing or invalid
            UnauthorizedError: If user_id not in trip's member_ids
            NotFoundError: If trip or catalog attraction doesn't exist
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        self._validate_save_fields(data)

        trip_id = data.get("trip_id")
        user_id = data.get("user_id")
        attraction_data = data.get("attraction", {})

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Route to appropriate attractions service endpoint
        if "catalog_attraction_id" in attraction_data:
            # Catalog mode
            catalog_attraction_id = attraction_data["catalog_attraction_id"]
            overrides = {
                k: v
                for k, v in attraction_data.items()
                if k in ["visit_time", "duration_minutes", "cost"]
            }
            created_attraction = self.attractions_client.save_attraction_from_catalog(
                trip_id=trip_id,
                catalog_attraction_id=catalog_attraction_id,
                overrides=overrides if overrides else None,
            )
        else:
            # Manual mode
            created_attraction = self.attractions_client.save_attraction(
                trip_id=trip_id,
                data=attraction_data,
            )

        # Step 4: Publish ATTRACTION_ADDED event to Redis
        try:
            publish_event(
                trip_id=trip_id,
                event_type="ATTRACTION_ADDED",
                data=created_attraction,
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - save is more critical than notification
            logger.error(f"Failed to publish ATTRACTION_ADDED event to Redis: {str(e)}")

        return created_attraction

    def update_attraction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an attraction.

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to trip (member_ids check)
        3. Calls attractions service to update attraction
        4. Publishes ATTRACTION_UPDATED event to Redis

        Args:
            data: Dictionary with attraction update request data
                Required: attraction_id, trip_id, user_id, attraction (object with fields to update)

        Returns:
            Dictionary containing updated attraction data

        Raises:
            ValidationError: If required fields are missing
            UnauthorizedError: If user_id not in trip's member_ids
            NotFoundError: If trip or attraction doesn't exist
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        self._validate_update_fields(data)

        attraction_id = data.get("attraction_id")
        trip_id = data.get("trip_id")
        user_id = data.get("user_id")
        attraction_data = data.get("attraction", {})

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Call attractions service to update attraction
        updated_attraction = self.attractions_client.update_attraction(
            trip_id=trip_id,
            attraction_id=attraction_id,
            data=attraction_data,
        )

        # Step 4: Publish ATTRACTION_UPDATED event to Redis
        try:
            publish_event(
                trip_id=trip_id,
                event_type="ATTRACTION_UPDATED",
                data=updated_attraction,
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - update is more critical than notification
            logger.error(
                f"Failed to publish ATTRACTION_UPDATED event to Redis: {str(e)}"
            )

        return updated_attraction

    def delete_attraction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Soft delete an attraction.

        This method coordinates:
        1. Validates required fields
        2. Validates user has access to trip (member_ids check)
        3. Fetches full attraction data before deletion (for Redis event)
        4. Calls attractions service to delete attraction
        5. Publishes ATTRACTION_DELETED event to Redis

        Args:
            data: Dictionary with attraction delete request data
                Required: attraction_id, trip_id, user_id

        Returns:
            Dictionary containing:
                - deleted_attraction: Full attraction data before deletion
                - message: Confirmation message

        Raises:
            ValidationError: If required fields are missing
            UnauthorizedError: If user_id not in trip's member_ids
            NotFoundError: If trip or attraction doesn't exist
            ExternalServiceError: If downstream services fail
        """
        # Step 1: Validate required fields
        self._validate_delete_fields(data)

        attraction_id = data.get("attraction_id")
        trip_id = data.get("trip_id")
        user_id = data.get("user_id")

        # Step 2: Get trip and validate user authorization
        trip = self.trips_client.get_trip(trip_id)
        self._validate_user_access(trip, user_id)

        # Step 3: Fetch full attraction data before deletion (for Redis event)
        attraction_data = self.attractions_client.get_attraction(attraction_id)

        # Step 4: Call attractions service to delete attraction
        self.attractions_client.delete_attraction(
            trip_id=trip_id,
            attraction_id=attraction_id,
        )

        # Step 5: Publish ATTRACTION_DELETED event to Redis
        try:
            publish_event(
                trip_id=trip_id,
                event_type="ATTRACTION_DELETED",
                data={
                    "attraction_id": attraction_id,
                    "deleted_attraction": attraction_data,
                },
                user_id=user_id,
            )
        except Exception as e:
            # Log error but continue - deletion is more critical than notification
            logger.error(
                f"Failed to publish ATTRACTION_DELETED event to Redis: {str(e)}"
            )

        return {
            "deleted_attraction": attraction_data,
            "message": "Attraction deleted successfully",
        }

    def _validate_update_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate required fields for update operation.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If required fields are missing
        """
        required_fields = ["attraction_id", "trip_id", "user_id", "attraction"]
        missing = [field for field in required_fields if not data.get(field)]

        if missing:
            raise ValidationError(f"Missing required fields: {', '.join(missing)}")

        # Validate attraction object has at least one updatable field
        attraction = data.get("attraction", {})
        if not isinstance(attraction, dict) or not attraction:
            raise ValidationError(
                "attraction field must be a non-empty object with fields to update"
            )

    def _validate_delete_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate required fields for delete operation.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If required fields are missing
        """
        required_fields = ["attraction_id", "trip_id", "user_id"]
        missing = [field for field in required_fields if not data.get(field)]

        if missing:
            raise ValidationError(f"Missing required fields: {', '.join(missing)}")

    def _validate_save_fields(self, data: Dict[str, Any]) -> None:
        """
        Validate required fields for save operation.

        Args:
            data: Request data dictionary

        Raises:
            ValidationError: If required fields are missing or invalid
        """
        required_fields = ["trip_id", "user_id", "attraction"]
        missing = [field for field in required_fields if not data.get(field)]

        if missing:
            raise ValidationError(f"Missing required fields: {', '.join(missing)}")

        # Validate attraction object
        attraction = data.get("attraction", {})
        if not isinstance(attraction, dict) or not attraction:
            raise ValidationError("attraction field must be a non-empty object")

        # Validate mode-specific requirements
        has_catalog_id = "catalog_attraction_id" in attraction
        has_name = "name" in attraction

        if not has_catalog_id and not has_name:
            raise ValidationError(
                "attraction must contain either 'name' (manual mode) or "
                "'catalog_attraction_id' (catalog mode)"
            )

    def _validate_user_access(self, trip: Dict[str, Any], user_id: str) -> None:
        """
        Validate that the user has access to the trip.

        Args:
            trip: Trip data dictionary
            user_id: User UUID to check

        Raises:
            UnauthorizedError: If user_id not in trip's member_ids
        """
        member_ids = trip.get("member_ids", [])

        # Also check user_ids for backwards compatibility
        if not member_ids:
            member_ids = trip.get("user_ids", [])

        if user_id not in member_ids:
            raise UnauthorizedError(f"User {user_id} does not have access to this trip")
