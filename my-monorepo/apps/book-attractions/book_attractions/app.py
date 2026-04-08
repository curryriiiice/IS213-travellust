from __future__ import annotations

import math
import os
import random
from http import HTTPStatus
from typing import Callable

from flask import Flask, jsonify, request

from book_attractions.clients import (
    AttractionsClient,
    BookedTicketsClient,
    HttpError,
    TripsClient,
)
from book_attractions.publisher import publish_booking_event

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
    for key in ("member_ids", "user_ids", "users", "traveler_ids", "members"):
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

# tested booking failure
def _should_fail_booking(random_value: float | None = None) -> bool:
    value = random.random() if random_value is None else random_value
    return False


def _validate_booked_ticket_record(
    booked_ticket_record: dict,
    ticket_holder_id,
    attraction_id: str,
) -> None:
    if str(booked_ticket_record.get("user_id")) != str(ticket_holder_id):
        raise HttpError(
            "booked_tickets service returned a record for the wrong user."
        )
    if str(booked_ticket_record.get("f_h_a_id")) != str(attraction_id):
        raise HttpError(
            "booked_tickets service returned a record for the wrong attraction."
        )
    if booked_ticket_record.get("booked_ticket_id") is None:
        raise HttpError(
            "booked_tickets service did not return a booked_ticket_id."
        )


def _resolve_booking_cost(payload: dict, attraction: dict) -> object:
    if "cost" in payload:
        return payload["cost"]
    return attraction.get("cost")


def _build_success_payload(
    payload: dict,
    attraction: dict,
    booked_ticket_records: list[dict],
    trip_id: str,
) -> dict:
    return {
        "service": "book-attractions",
        "trip_id": trip_id,
        "attraction_id": attraction["attraction_id"],
        "attraction_name": attraction.get("name"),
        "paid_by": payload["paid_by"],
        "user_id": list(payload["user_id"]),
        "booking_id": [
            record["booked_ticket_id"] for record in booked_ticket_records
        ],
        "cost": _resolve_booking_cost(payload, attraction),
        "status": "success",
    }


def _build_failure_payload(
    payload: dict,
    trip_id: str,
    reason: str,
    attraction: dict | None = None,
) -> dict:
    return {
        "service": "book-attractions",
        "trip_id": trip_id,
        "attraction_id": (
            attraction.get("attraction_id")
            if attraction
            else payload.get("attraction_id")
        ),
        "attraction_name": attraction.get("name") if attraction else None,
        "paid_by": payload["paid_by"],
        "user_id": list(payload["user_id"]),
        "reason": reason,
        "status": "failure",
    }


def _find_active_booked_tickets_for_attraction(
    booked_tickets_client: BookedTicketsClient,
    attraction_id: str,
    user_ids: list[str],
) -> list[dict]:
    matches: list[dict] = []
    for user_id in user_ids:
        tickets = booked_tickets_client.list_booked_tickets_by_user(str(user_id))
        for ticket in tickets:
            if (
                str(ticket.get("f_h_a_id")) == str(attraction_id)
                and not ticket.get("cancelled", False)
            ):
                matches.append(ticket)
    return matches


def create_app(
    attractions_client: AttractionsClient | None = None,
    booked_tickets_client: BookedTicketsClient | None = None,
    trips_client: TripsClient | None = None,
    random_value_fn=None,
    publish_event_fn: Callable[[str, dict], bool] | None = None,
) -> Flask:
    app = Flask(__name__)
    attractions = attractions_client or AttractionsClient()
    booked_tickets = booked_tickets_client or BookedTicketsClient()
    trips = trips_client or TripsClient()
    draw_random = random_value_fn or random.random
    publish_event = publish_event_fn or publish_booking_event

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "book-attractions", "status": "ok"}), HTTPStatus.OK

    @app.post("/api/book-attractions")
    def book_attraction():
        payload = None
        trip_id = None
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

        attraction = None
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
                publish_event(
                    "booking.failure",
                    _build_failure_payload(
                        payload,
                        trip_id,
                        "Simulated booking failure. Please try again.",
                        attraction,
                    ),
                )
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

                booked_ticket_record = booked_tickets.create_booked_ticket(
                    booked_ticket_payload
                )
                _validate_booked_ticket_record(
                    booked_ticket_record,
                    ticket_holder_id,
                    str(attraction["attraction_id"]),
                )
                booked_ticket_records.append(booked_ticket_record)
        except HttpError as exc:
            if payload is not None and trip_id is not None:
                publish_event(
                    "booking.failure",
                    _build_failure_payload(payload, trip_id, str(exc), attraction),
                )
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

        publish_event(
            "booking.success",
            _build_success_payload(
                payload,
                attraction,
                booked_ticket_records,
                trip_id,
            ),
        )

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

    @app.post("/api/cancel-attractions")
    def cancel_attraction_booking():
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
                return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND

            matched_tickets = _find_active_booked_tickets_for_attraction(
                booked_tickets,
                str(payload["attraction_id"]),
                [str(user_id) for user_id in payload["user_id"]],
            )

            if not matched_tickets:
                return (
                    jsonify({"error": "No active attraction booking found to cancel."}),
                    HTTPStatus.NOT_FOUND,
                )

            cancelled_records = []
            for ticket in matched_tickets:
                cancelled_records.append(
                    booked_tickets.update_booked_ticket(
                        str(ticket["booked_ticket_id"]),
                        {"cancelled": True},
                    )
                )

            return (
                jsonify(
                    {
                        "data": {
                            "resolved_trip_id": trip_id,
                            "attraction_id": payload["attraction_id"],
                            "cancelled_tickets": cancelled_records,
                            "booking_confirmation": "Booking cancelled.",
                        }
                    }
                ),
                HTTPStatus.OK,
            )
        except HttpError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5015"))
    app.run(debug=True, port=port)
