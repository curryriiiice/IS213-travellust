from __future__ import annotations

import os
from http import HTTPStatus

from flask import Flask, jsonify, request

from book_attractions.clients import (
    AttractionsClient,
    BookedTicketsClient,
    HttpError,
    TripsClient,
)

REQUIRED_FIELDS = {"user_id", "paid_by", "trip_id"}
OPTIONAL_FIELDS = {
    "catalog_attraction_id",
    "attraction_id",
    "visit_time",
    "duration_minutes",
    "cost",
    "cancelled",
}
CATALOG_COPY_FIELDS = {"visit_time", "duration_minutes", "cost"}


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
    has_catalog_id = "catalog_attraction_id" in payload
    has_attraction_id = "attraction_id" in payload
    if has_catalog_id == has_attraction_id:
        raise ValueError(
            "Request must include exactly one of catalog_attraction_id or attraction_id."
        )

    user_ids = payload["user_id"]
    if not isinstance(user_ids, list) or not user_ids:
        raise ValueError("user_id must be a non-empty list of ticket holder user IDs.")
    if any(user_id is None for user_id in user_ids):
        raise ValueError("user_id cannot contain empty values.")
    if payload["paid_by"] is None:
        raise ValueError("paid_by must be the payer's user ID.")

    return payload


def _validate_trip_membership(
    trip_id: str,
    payer_id: str | int,
    ticket_holder_ids: list,
    trips_client: TripsClient,
) -> None:
    users_to_check = [payer_id, *ticket_holder_ids]
    for user_id in dict.fromkeys(users_to_check):
        if not trips_client.user_belongs_to_trip(trip_id, user_id):
            raise ValueError(f"User {user_id} does not belong to trip {trip_id}.")


def create_app(
    attractions_client: AttractionsClient | None = None,
    booked_tickets_client: BookedTicketsClient | None = None,
    trips_client: TripsClient | None = None,
) -> Flask:
    app = Flask(__name__)
    attractions = attractions_client or AttractionsClient()
    booked_tickets = booked_tickets_client or BookedTicketsClient()
    trips = trips_client or TripsClient()

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
                payload["paid_by"],
                payload["user_id"],
                trips,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST
        except HttpError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

        try:
            if "catalog_attraction_id" in payload:
                catalog_payload = {
                    key: payload[key]
                    for key in CATALOG_COPY_FIELDS
                    if key in payload
                }
                attraction = attractions.create_from_catalog(
                    trip_id, str(payload["catalog_attraction_id"]), catalog_payload
                )
                if attraction is None:
                    return (
                        jsonify({"error": "Catalog attraction not found"}),
                        HTTPStatus.NOT_FOUND,
                    )
            else:
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
