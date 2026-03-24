from __future__ import annotations

import math
import os
import random
from http import HTTPStatus

from flask import Flask, jsonify, request

from book_attractions.clients import (
    AttractionsClient,
    BookedTicketsClient,
    HttpError,
    TripsClient,
)

REQUIRED_FIELDS = {"user_id", "paid_by", "trip_id", "attraction_id"}
OPTIONAL_FIELDS = {"cost", "cancelled"}


def _validate_payload(payload: object) -> dict:
    if payload is None:
        raise ValueError("Request body is required.")
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    missing_fields = sorted(REQUIRED_FIELDS - payload.keys())
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}.")

    invalid_fields = sorted(set(payload) - REQUIRED_FIELDS - OPTIONAL_FIELDS)
    if invalid_fields:
        raise ValueError(
            f"These fields cannot be set through this API: {', '.join(invalid_fields)}."
        )

    user_ids = payload["user_id"]
    if not isinstance(user_ids, list) or not user_ids:
        raise ValueError("user_id must be a non-empty list of ticket holder user IDs.")
    if any(user_id is None for user_id in user_ids):
        raise ValueError("user_id cannot contain empty values.")
    if payload["paid_by"] is None:
        raise ValueError("paid_by must be the payer's user ID.")

    return payload


def _extract_trip_user_ids(trip: dict) -> list[str]:
    for key in ("user_ids", "users", "traveler_ids", "members"):
        value = trip.get(key)
        if isinstance(value, list):
            extracted_ids = []
            for item in value:
                if isinstance(item, dict):
                    user_id = item.get("user_id") or item.get("id")
                    if user_id is not None:
                        extracted_ids.append(str(user_id))
                elif item is not None:
                    extracted_ids.append(str(item))
            if extracted_ids:
                return extracted_ids
    return []


def _validate_trip_membership(trip_id: str, user_ids: list, trips_client: TripsClient) -> None:
    trip = trips_client.get_trip(trip_id)
    if trip is None:
        raise ValueError(f"Trip {trip_id} was not found.")

    trip_user_ids = set(_extract_trip_user_ids(trip))
    if not trip_user_ids:
        raise ValueError(f"Trip {trip_id} does not expose any user IDs.")

    missing_users = [
        str(user_id)
        for user_id in dict.fromkeys(user_ids)
        if str(user_id) not in trip_user_ids
    ]
    if missing_users:
        raise ValueError(
            "These users do not belong to trip "
            f"{trip_id}: {', '.join(missing_users)}."
        )


def _should_fail_booking(random_value: float | None = None) -> bool:
    value = random.random() if random_value is None else random_value
    return math.floor(value * 5) == 0


def create_app(
    attractions_client: AttractionsClient | None = None,
    booked_tickets_client: BookedTicketsClient | None = None,
    trips_client: TripsClient | None = None,
    random_value_fn=None,
) -> Flask:
    app = Flask(__name__)
    attractions = attractions_client or AttractionsClient()
    booked_tickets = booked_tickets_client or BookedTicketsClient()
    trips = trips_client or TripsClient()
    draw_random = random_value_fn or random.random

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "book-attractions", "status": "ok"}), HTTPStatus.OK

    @app.post("/api/book-attractions")
    def book_attraction():
        try:
            payload = _validate_payload(request.get_json(silent=True))
            trip_id = str(payload["trip_id"])
            _validate_trip_membership(
                trip_id,
                [payload["paid_by"], *payload["user_id"]],
                trips,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST
        except HttpError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

        try:
            attraction = attractions.get_attraction(str(payload["attraction_id"]))
            if attraction is None:
                return (
                    jsonify({"error": "Attraction not found"}),
                    HTTPStatus.NOT_FOUND,
                )

            if str(attraction.get("trip_id")) != trip_id:
                return (
                    jsonify(
                        {
                            "error": "Selected attraction does not belong to trip "
                            f"{trip_id}."
                        }
                    ),
                    HTTPStatus.BAD_REQUEST,
                )

            if _should_fail_booking(draw_random()):
                return (
                    jsonify(
                        {
                            "error": "Simulated booking failure. Please try again.",
                            "data": {
                                "resolved_trip_id": trip_id,
                                "user_id": payload["user_id"],
                                "f_h_a_id": attraction["attraction_id"],
                                "cost": payload.get("cost", attraction.get("cost")),
                                "paid_by": payload["paid_by"],
                            },
                        }
                    ),
                    HTTPStatus.SERVICE_UNAVAILABLE,
                )

            booked_ticket_records = []
            for ticket_holder_id in payload["user_id"]:
                booked_ticket_payload = {
                    "user_id": ticket_holder_id,
                    "f_h_a_id": attraction["attraction_id"],
                    "paid_by": payload["paid_by"],
                    "cancelled": payload.get("cancelled", False),
                }
                if "cost" in payload:
                    booked_ticket_payload["cost"] = payload["cost"]
                elif attraction.get("cost") is not None:
                    booked_ticket_payload["cost"] = attraction["cost"]

                booked_ticket_records.append(
                    booked_tickets.create_booked_ticket(booked_ticket_payload)
                )
        except HttpError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

        return (
            jsonify(
                {
                    "data": {
                        "resolved_trip_id": trip_id,
                        "attraction": attraction,
                        "booking_confirmation": "Booking successful.",
                        "booked_tickets": booked_ticket_records,
                    }
                }
            ),
            HTTPStatus.CREATED,
        )

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5010"))
    app.run(debug=True, port=port)
