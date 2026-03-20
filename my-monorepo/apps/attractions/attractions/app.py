from __future__ import annotations

import os
from http import HTTPStatus

from flask import Flask, jsonify, request

from attractions.repository import SupabaseAttractionRepository

REQUIRED_CREATE_FIELDS = {"trip_id", "name"}
MUTABLE_FIELDS = {
    "trip_id",
    "name",
    "location",
    "gmaps_link",
    "visit_time",
    "duration_minutes",
    "cost",
}
CATALOG_COPY_OPTIONAL_FIELDS = {"visit_time", "duration_minutes", "cost"}


def _validate_payload(payload: object) -> dict:
    if payload is None:
        raise ValueError("Request body is required.")
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    return payload


def _validate_create_payload(payload: dict) -> dict:
    missing_fields = sorted(REQUIRED_CREATE_FIELDS - payload.keys())
    if missing_fields:
        missing_fields_str = ", ".join(missing_fields)
        raise ValueError(f"Missing required fields: {missing_fields_str}.")

    invalid_fields = sorted(set(payload) - MUTABLE_FIELDS)
    if invalid_fields:
        invalid_fields_str = ", ".join(invalid_fields)
        raise ValueError(
            "These fields cannot be set through this API: "
            f"{invalid_fields_str}."
        )

    return payload


def _validate_update_payload(payload: dict) -> dict:
    invalid_fields = sorted(set(payload) - MUTABLE_FIELDS)
    if invalid_fields:
        invalid_fields_str = ", ".join(invalid_fields)
        raise ValueError(
            "These fields cannot be updated through this API: "
            f"{invalid_fields_str}."
        )
    if not payload:
        raise ValueError("Request body must contain at least one updatable field.")
    return payload


def _validate_catalog_copy_payload(payload: object) -> dict:
    if payload is None:
        return {}
    payload = _validate_payload(payload)
    invalid_fields = sorted(set(payload) - CATALOG_COPY_OPTIONAL_FIELDS)
    if invalid_fields:
        invalid_fields_str = ", ".join(invalid_fields)
        raise ValueError(
            "These fields cannot be set when adding from the catalog: "
            f"{invalid_fields_str}."
        )
    return payload


def create_app(repository: SupabaseAttractionRepository | None = None) -> Flask:
    app = Flask(__name__)
    repo = repository or SupabaseAttractionRepository()

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "attractions", "status": "ok"}), HTTPStatus.OK

    @app.get("/api/attractions")
    def list_attractions():
        attractions = repo.list_attractions()
        return jsonify({"count": len(attractions), "data": attractions}), HTTPStatus.OK

    @app.get("/api/trips/<trip_id>/attractions")
    def list_attractions_by_trip(trip_id: str):
        attractions = repo.list_attractions_by_trip(trip_id)
        return jsonify({"count": len(attractions), "data": attractions}), HTTPStatus.OK

    @app.get("/api/catalog/attractions")
    def list_catalog_attractions():
        search = request.args.get("search", type=str)
        attractions = repo.list_catalog_attractions(search=search)
        return jsonify({"count": len(attractions), "data": attractions}), HTTPStatus.OK

    @app.get("/api/catalog/attractions/<catalog_attraction_id>")
    def get_catalog_attraction(catalog_attraction_id: str):
        attraction = repo.get_catalog_attraction(catalog_attraction_id)
        if attraction is None:
            return (
                jsonify({"error": "Catalog attraction not found"}),
                HTTPStatus.NOT_FOUND,
            )
        return jsonify({"data": attraction}), HTTPStatus.OK

    @app.get("/api/attractions/<attraction_id>")
    def get_attraction(attraction_id: str):
        attraction = repo.get_attraction(attraction_id)
        if attraction is None:
            return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"data": attraction}), HTTPStatus.OK

    @app.post("/api/attractions")
    def create_attraction():
        try:
            payload = _validate_create_payload(
                _validate_payload(request.get_json(silent=True))
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        attraction = repo.create_attraction(payload)
        return jsonify({"data": attraction}), HTTPStatus.CREATED

    @app.post("/api/trips/<trip_id>/attractions/from-catalog")
    def create_attraction_from_catalog(trip_id: str):
        try:
            payload = _validate_catalog_copy_payload(request.get_json(silent=True))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        catalog_attraction_id = request.args.get("catalog_attraction_id", type=str)
        if not catalog_attraction_id:
            return (
                jsonify({"error": "catalog_attraction_id query parameter is required"}),
                HTTPStatus.BAD_REQUEST,
            )

        attraction = repo.create_attraction_from_catalog(
            trip_id, catalog_attraction_id, payload
        )
        if attraction is None:
            return (
                jsonify({"error": "Catalog attraction not found"}),
                HTTPStatus.NOT_FOUND,
            )
        return jsonify({"data": attraction}), HTTPStatus.CREATED

    @app.put("/api/attractions/<attraction_id>")
    def update_attraction(attraction_id: str):
        try:
            payload = _validate_update_payload(
                _validate_payload(request.get_json(silent=True))
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        attraction = repo.update_attraction(attraction_id, payload)
        if attraction is None:
            return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"data": attraction}), HTTPStatus.OK

    @app.delete("/api/attractions/<attraction_id>")
    def delete_attraction(attraction_id: str):
        deleted = repo.delete_attraction(attraction_id)
        if deleted is None:
            return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND
        return (
            jsonify({"message": "Attraction deleted", "data": deleted}),
            HTTPStatus.OK,
        )

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    app.run(debug=True, port=port)
