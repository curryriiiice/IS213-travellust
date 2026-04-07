"""HTTP Client for Attractions Service."""

import requests
from typing import Dict, Any
from ..config import Config
from ..utils.api_errors import (
    ExternalServiceError,
    NotFoundError,
)


class AttractionsClient:
    """Client for communicating with the attractions service."""

    def __init__(self):
        """Initialize the Attractions client with service URL."""
        self.base_url = f"http://{Config.ATTRACTIONS_HOST}:{Config.ATTRACTIONS_PORT}"
        self.timeout = Config.REQUEST_TIMEOUT

    def get_attraction(self, attraction_id: str) -> Dict[str, Any]:
        """
        Get attraction details by ID.

        Args:
            attraction_id: Attraction UUID to fetch

        Returns:
            Attraction data dictionary

        Raises:
            NotFoundError: If attraction not found
            ExternalServiceError: If attractions service fails
        """
        url = f"{self.base_url}/api/attractions/{attraction_id}"

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(f"Attraction with ID {attraction_id} not found")

            if response.status_code != 200:
                raise ExternalServiceError(
                    f"Attractions service returned status {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            data = response.json()
            return data.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ExternalServiceError(
                f"Could not connect to attractions service at {self.base_url}: {str(e)}",
                status_code=503,
            )
        except requests.exceptions.Timeout:
            raise ExternalServiceError(
                f"Attractions service request timed out after {self.timeout}s",
                status_code=504,
            )
        except requests.exceptions.RequestException as e:
            raise ExternalServiceError(
                f"Error communicating with attractions service: {str(e)}",
                status_code=503,
            )

    def update_attraction(
        self, trip_id: str, attraction_id: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update an attraction via the attractions service.

        Args:
            trip_id: Trip UUID the attraction belongs to
            attraction_id: Attraction UUID to update
            data: Dictionary of fields to update (visit_time, duration_minutes, cost, etc.)

        Returns:
            Updated attraction data dictionary

        Raises:
            NotFoundError: If attraction not found
            ExternalServiceError: If attractions service fails
        """
        url = f"{self.base_url}/api/trips/{trip_id}/attractions/{attraction_id}"

        try:
            response = requests.put(url, json=data, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(
                    f"Attraction {attraction_id} not found in trip {trip_id}"
                )

            if response.status_code == 400:
                error_data = response.json()
                raise ExternalServiceError(
                    f"Validation error: {error_data.get('error', 'Invalid request')}",
                    status_code=400,
                )

            if response.status_code != 200:
                raise ExternalServiceError(
                    f"Attractions service returned status {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            result = response.json()
            return result.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ExternalServiceError(
                f"Could not connect to attractions service at {self.base_url}: {str(e)}",
                status_code=503,
            )
        except requests.exceptions.Timeout:
            raise ExternalServiceError(
                f"Attractions service request timed out after {self.timeout}s",
                status_code=504,
            )
        except requests.exceptions.RequestException as e:
            raise ExternalServiceError(
                f"Error communicating with attractions service: {str(e)}",
                status_code=503,
            )

    def delete_attraction(self, trip_id: str, attraction_id: str) -> Dict[str, Any]:
        """
        Soft delete an attraction via the attractions service.

        Args:
            trip_id: Trip UUID the attraction belongs to
            attraction_id: Attraction UUID to delete

        Returns:
            Deletion result with attraction data

        Raises:
            NotFoundError: If attraction not found
            ExternalServiceError: If attractions service fails
        """
        url = f"{self.base_url}/api/trips/{trip_id}/attractions/{attraction_id}"

        try:
            response = requests.delete(url, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(
                    f"Attraction {attraction_id} not found in trip {trip_id}"
                )

            if response.status_code != 200:
                raise ExternalServiceError(
                    f"Attractions service returned status {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            result = response.json()
            return result.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ExternalServiceError(
                f"Could not connect to attractions service at {self.base_url}: {str(e)}",
                status_code=503,
            )
        except requests.exceptions.Timeout:
            raise ExternalServiceError(
                f"Attractions service request timed out after {self.timeout}s",
                status_code=504,
            )
        except requests.exceptions.RequestException as e:
            raise ExternalServiceError(
                f"Error communicating with attractions service: {str(e)}",
                status_code=503,
            )

    def save_attraction(self, trip_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a manual attraction in a trip.

        Calls: POST /api/trips/{trip_id}/attractions

        Args:
            trip_id: Trip UUID
            data: Attraction data dictionary
                Required: name
                Optional: location, visit_time, duration_minutes, cost, gmaps_link

        Returns:
            Created attraction data dictionary

        Raises:
            NotFoundError: If trip not found
            ExternalServiceError: If attractions service fails
        """
        url = f"{self.base_url}/api/trips/{trip_id}/attractions"

        try:
            response = requests.post(url, json=data, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(f"Trip {trip_id} not found")

            if response.status_code == 400:
                error_data = response.json()
                raise ExternalServiceError(
                    f"Validation error: {error_data.get('error', 'Invalid request')}",
                    status_code=400,
                )

            if response.status_code != 201:
                raise ExternalServiceError(
                    f"Attractions service returned status {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            result = response.json()
            return result.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ExternalServiceError(
                f"Could not connect to attractions service at {self.base_url}: {str(e)}",
                status_code=503,
            )
        except requests.exceptions.Timeout:
            raise ExternalServiceError(
                f"Attractions service request timed out after {self.timeout}s",
                status_code=504,
            )
        except requests.exceptions.RequestException as e:
            raise ExternalServiceError(
                f"Error communicating with attractions service: {str(e)}",
                status_code=503,
            )

    def save_attraction_from_catalog(
        self, trip_id: str, catalog_attraction_id: str, overrides: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create an attraction from catalog in a trip.

        Calls: POST /api/trips/{trip_id}/attractions/from-catalog

        Args:
            trip_id: Trip UUID
            catalog_attraction_id: Catalog attraction UUID to copy from
            overrides: Optional field overrides (visit_time, duration_minutes, cost)

        Returns:
            Created attraction data dictionary

        Raises:
            NotFoundError: If trip or catalog attraction not found
            ExternalServiceError: If attractions service fails
        """
        url = f"{self.base_url}/api/trips/{trip_id}/attractions/from-catalog"

        # Build request payload
        payload = {"catalog_attraction_id": catalog_attraction_id}
        if overrides:
            # Only include allowed override fields
            allowed_overrides = {"visit_time", "duration_minutes", "cost"}
            payload.update(
                {k: v for k, v in overrides.items() if k in allowed_overrides}
            )

        try:
            response = requests.post(url, json=payload, timeout=self.timeout)

            if response.status_code == 404:
                error_data = response.json()
                error_msg = error_data.get("error", "Not found")
                raise NotFoundError(error_msg)

            if response.status_code == 400:
                error_data = response.json()
                raise ExternalServiceError(
                    f"Validation error: {error_data.get('error', 'Invalid request')}",
                    status_code=400,
                )

            if response.status_code != 201:
                raise ExternalServiceError(
                    f"Attractions service returned status {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            result = response.json()
            return result.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ExternalServiceError(
                f"Could not connect to attractions service at {self.base_url}: {str(e)}",
                status_code=503,
            )
        except requests.exceptions.Timeout:
            raise ExternalServiceError(
                f"Attractions service request timed out after {self.timeout}s",
                status_code=504,
            )
        except requests.exceptions.RequestException as e:
            raise ExternalServiceError(
                f"Error communicating with attractions service: {str(e)}",
                status_code=503,
            )
