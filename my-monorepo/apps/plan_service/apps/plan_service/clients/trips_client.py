"""HTTP Client for Trips Atomic Service."""

import requests
from typing import Dict, Any
from ..config import Config
from ..utils.api_errors import (
    ServiceUnavailableError,
    NotFoundError,
    InternalServerError,
)


class TripsClient:
    """Client for communicating with the trips_atomic service."""

    def __init__(self):
        """Initialize the Trips client with service URL."""
        self.base_url = f"http://{Config.TRIPS_ATOMIC_HOST}:{Config.TRIPS_ATOMIC_PORT}"
        self.timeout = Config.REQUEST_TIMEOUT

    def get_trip(self, trip_id: str) -> Dict[str, Any]:
        """
        Get trip details by ID.

        Args:
            trip_id: Trip UUID to fetch

        Returns:
            Trip data dictionary

        Raises:
            NotFoundError: If trip not found
            ServiceUnavailableError: If trips service is unavailable
            InternalServerError: If trips service returns an error
        """
        url = f"{self.base_url}/api/trips/{trip_id}"

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(f"Trip with ID {trip_id} not found")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Trips service returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            return data.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ServiceUnavailableError(
                f"Could not connect to trips service at {self.base_url}: {str(e)}"
            )
        except requests.exceptions.Timeout as e:
            raise ServiceUnavailableError(
                f"Trips service request timed out after {self.timeout}s: {str(e)}"
            )
        except requests.exceptions.RequestException as e:
            raise ServiceUnavailableError(
                f"Error communicating with trips service: {str(e)}"
            )

    def append_hotel_id(self, trip_id: str, hotel_id: str) -> Dict[str, Any]:
        """
        Append a hotel_id to the trip's hotel_ids array.

        This method:
        1. Fetches the current trip data
        2. Extracts the existing hotel_ids array (or initializes as empty list)
        3. Appends the new hotel_id
        4. Updates the trip with PUT request

        Args:
            trip_id: Trip UUID to update
            hotel_id: Hotel UUID to append to hotel_ids array

        Returns:
            Updated trip data dictionary

        Raises:
            NotFoundError: If trip not found
            ServiceUnavailableError: If trips service is unavailable
            InternalServerError: If trips service returns an error
        """
        # Step 1: Get current trip data
        trip_data = self.get_trip(trip_id)

        # Step 2: Extract and update hotel_ids array
        hotel_ids = trip_data.get("hotel_ids", [])
        if not isinstance(hotel_ids, list):
            hotel_ids = []

        # Append new hotel_id if not already present
        if hotel_id not in hotel_ids:
            hotel_ids.append(hotel_id)

        # Step 3: Update trip with new hotel_ids array
        url = f"{self.base_url}/api/trips/{trip_id}"
        payload = {"hotel_ids": hotel_ids}

        try:
            response = requests.put(url, json=payload, timeout=self.timeout)

            if response.status_code == 404:
                raise NotFoundError(f"Trip with ID {trip_id} not found")

            if response.status_code != 200:
                raise InternalServerError(
                    f"Failed to update trip. Trips service returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            return data.get("data", {})

        except requests.exceptions.ConnectionError as e:
            raise ServiceUnavailableError(
                f"Could not connect to trips service at {self.base_url}: {str(e)}"
            )
        except requests.exceptions.Timeout as e:
            raise ServiceUnavailableError(
                f"Trips service request timed out after {self.timeout}s: {str(e)}"
            )
        except requests.exceptions.RequestException as e:
            raise ServiceUnavailableError(
                f"Error communicating with trips service: {str(e)}"
            )
