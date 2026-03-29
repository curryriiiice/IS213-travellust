from __future__ import annotations

import json
import os
from urllib import error, parse, request


class TripsClientError(RuntimeError):
    pass


class TripsClient:
    def __init__(self, base_url: str | None = None, table_name: str | None = None):
        self.base_url = (base_url or os.getenv("TRIPS_SERVICE_URL", "http://trips_atomic:5000")).rstrip("/")
        self.table_name = table_name or os.getenv("TRIPS_TABLE_NAME", "trips")

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        body = None
        headers = {}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = request.Request(url, data=body, headers=headers, method=method)
        try:
            with request.urlopen(req, timeout=10) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except error.HTTPError as exc:
            body_text = exc.read().decode("utf-8", errors="ignore")
            if exc.code == 404:
                return {}
            raise TripsClientError(
                f"Trips service request failed with status {exc.code}: {body_text or exc.reason}"
            ) from exc
        except error.URLError as exc:
            raise TripsClientError(f"Trips service request failed: {exc.reason}") from exc

    def get_trip(self, trip_id: str) -> dict | None:
        response = self._request(
            "GET",
            f"/api/{parse.quote(self.table_name)}/{parse.quote(trip_id)}",
        )
        return response.get("data")

    def append_attraction_id(self, trip_id: str, attraction_id: str) -> dict:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise TripsClientError(f"Trip {trip_id} was not found.")

        attraction_ids = trip.get("attraction_ids") or []
        if not isinstance(attraction_ids, list):
            raise TripsClientError(
                f"Trip {trip_id} has an invalid attraction_ids value."
            )

        normalized_ids = [str(existing_id) for existing_id in attraction_ids if existing_id is not None]
        if attraction_id not in normalized_ids:
            normalized_ids.append(attraction_id)

        response = self._request(
            "PUT",
            f"/api/{parse.quote(self.table_name)}/{parse.quote(trip_id)}",
            {"attraction_ids": normalized_ids},
        )
        trip_data = response.get("data")
        if trip_data is None:
            raise TripsClientError(f"Trips service did not return updated trip {trip_id}.")
        return trip_data
