from __future__ import annotations

import os
from http import HTTPStatus

from flask import Flask, jsonify, request

from booked_tickets.repository import SupabaseBookedTicketRepository

REQUIRED_CREATE_FIELDS = {"user_id", "f_h_a_id"}
MUTABLE_FIELDS = {"cost", "paid_by", "cancelled"}


def _validate_payload(payload: object) -> dict:
    if payload is None:
        raise ValueError("Request body is required.")
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    return payload


def _validate_create_payload(payload: dict) -> dict:
    missing_fields = sorted(REQUIRED_CREATE_FIELDS - payload.keys())
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}.")

    invalid_fields = sorted(set(payload) - REQUIRED_CREATE_FIELDS - MUTABLE_FIELDS)
    if invalid_fields:
        raise ValueError(
            f"These fields cannot be set through this API: {', '.join(invalid_fields)}."
        )
    return payload


def _validate_update_payload(payload: dict) -> dict:
    invalid_fields = sorted(set(payload) - MUTABLE_FIELDS)
    if invalid_fields:
        raise ValueError(
            f"These fields cannot be updated through this API: {', '.join(invalid_fields)}."
        )
    if not payload:
        raise ValueError("Request body must contain at least one updatable field.")
    return payload


def create_app(repository: SupabaseBookedTicketRepository | None = None) -> Flask:
    app = Flask(__name__)
    repo = repository or SupabaseBookedTicketRepository()

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "booked_tickets", "status": "ok"}), HTTPStatus.OK

    @app.get("/api/booked_tickets")
    def list_booked_tickets():
        tickets = repo.list_booked_tickets()
        return jsonify({"count": len(tickets), "data": tickets}), HTTPStatus.OK

    @app.get("/api/users/<user_id>/booked_tickets")
    def list_booked_tickets_by_user(user_id: str):
        tickets = repo.list_booked_tickets_by_user(user_id)
        return jsonify({"count": len(tickets), "data": tickets}), HTTPStatus.OK

    @app.get("/api/booked_tickets/<booked_ticket_id>")
    def get_booked_ticket(booked_ticket_id: str):
        ticket = repo.get_booked_ticket(booked_ticket_id)
        if ticket is None:
            return jsonify({"error": "Booked ticket not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"data": ticket}), HTTPStatus.OK

    @app.post("/api/booked_tickets")
    def create_booked_ticket():
        try:
            payload = _validate_create_payload(
                _validate_payload(request.get_json(silent=True))
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        ticket = repo.create_booked_ticket(payload)
        return jsonify({"data": ticket}), HTTPStatus.CREATED

    @app.put("/api/booked_tickets/<booked_ticket_id>")
    def update_booked_ticket(booked_ticket_id: str):
        try:
            payload = _validate_update_payload(
                _validate_payload(request.get_json(silent=True))
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        ticket = repo.update_booked_ticket(booked_ticket_id, payload)
        if ticket is None:
            return jsonify({"error": "Booked ticket not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"data": ticket}), HTTPStatus.OK

    @app.delete("/api/booked_tickets/<booked_ticket_id>")
    def delete_booked_ticket(booked_ticket_id: str):
        ticket = repo.delete_booked_ticket(booked_ticket_id)
        if ticket is None:
            return jsonify({"error": "Booked ticket not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"message": "Booked ticket deleted", "data": ticket}), HTTPStatus.OK

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5006"))
    app.run(debug=True, port=port)


