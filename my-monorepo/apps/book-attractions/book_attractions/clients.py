from __future__ import annotations

import os

from dotenv import load_dotenv
import requests

load_dotenv()


class HttpError(RuntimeError):
    """Raised when a downstream service call fails."""


class AttractionsClient:
    def __init__(self, base_url: str | None = None, timeout: float = 10.0):
        self.base_url = (base_url or os.getenv("ATTRACTIONS_SERVICE_URL", "")).rstrip("/")
        self.timeout = timeout

    def _request(self, method: str, path: str, **kwargs) -> dict | list | None:
        if not self.base_url:
            raise HttpError("ATTRACTIONS_SERVICE_URL is not configured.")
        response = requests.request(
            method,
            f"{self.base_url}{path}",
            timeout=self.timeout,
            **kwargs,
        )
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise HttpError(f"Attractions service error: {response.text}")
        return response.json()

    def get_attraction(self, attraction_id: str) -> dict | None:
        response = self._request("GET", f"/api/attractions/{attraction_id}")
        return response["data"] if response else None

    def create_from_catalog(
        self, trip_id: str, catalog_attraction_id: str, payload: dict
    ) -> dict | None:
        response = self._request(
            "POST",
            "/api/trips/"
            f"{trip_id}/attractions/from-catalog"
            f"?catalog_attraction_id={catalog_attraction_id}",
            json=payload,
        )
        return response["data"] if response else None


class BookedTicketsClient:
    def __init__(self, base_url: str | None = None, timeout: float = 10.0):
        self.base_url = (
            base_url or os.getenv("BOOKED_TICKETS_SERVICE_URL", "")
        ).rstrip("/")
        self.timeout = timeout

    def create_booked_ticket(self, payload: dict) -> dict:
        if not self.base_url:
            raise HttpError("BOOKED_TICKETS_SERVICE_URL is not configured.")
        response = requests.post(
            f"{self.base_url}/api/booked_tickets",
            json=payload,
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            raise HttpError(f"booked_tickets service error: {response.text}")
        return response.json()["data"]


class TripsClient:
    def __init__(
        self,
        trip_membership_url_template: str | None = None,
        timeout: float = 10.0,
    ):
        self.trip_membership_url_template = trip_membership_url_template or os.getenv(
            "TRIPS_TRIP_MEMBERSHIP_URL_TEMPLATE", ""
        )
        self.timeout = timeout

    def user_belongs_to_trip(self, trip_id: str, user_id: str | int) -> bool:
        if not self.trip_membership_url_template:
            raise HttpError("TRIPS_TRIP_MEMBERSHIP_URL_TEMPLATE is not configured.")
        url = self.trip_membership_url_template.format(trip_id=trip_id, user_id=user_id)
        response = requests.get(url, timeout=self.timeout)
        if response.status_code == 404:
            return False
        if response.status_code >= 400:
            raise HttpError(f"Trips service error: {response.text}")
        data = response.json()
        if isinstance(data, dict):
            if "data" in data:
                data = data["data"]
            if isinstance(data, dict):
                return bool(data)
            if isinstance(data, list):
                return len(data) > 0
            if isinstance(data, bool):
                return data
        return bool(data)
