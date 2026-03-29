from __future__ import annotations

import os
from http import HTTPStatus

from flask import Flask, jsonify, request

from attractions.repository import SupabaseAttractionRepository
from attractions.trips_client import TripsClient, TripsClientError

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
TRIP_SCOPED_MANUAL_FIELDS = MUTABLE_FIELDS - {"trip_id"}


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


def _validate_trip_scoped_create_payload(payload: object, trip_id: str) -> tuple[str, dict]:
    payload = _validate_payload(payload)

    if "catalog_attraction_id" in payload:
        catalog_attraction_id = payload["catalog_attraction_id"]
        if not catalog_attraction_id:
            raise ValueError("catalog_attraction_id cannot be empty.")

        invalid_fields = sorted(set(payload) - {"catalog_attraction_id"} - CATALOG_COPY_OPTIONAL_FIELDS)
        if invalid_fields:
            invalid_fields_str = ", ".join(invalid_fields)
            raise ValueError(
                "These fields cannot be set when adding from the catalog: "
                f"{invalid_fields_str}."
            )
        copy_payload = {key: payload[key] for key in CATALOG_COPY_OPTIONAL_FIELDS if key in payload}
        return "catalog", {"catalog_attraction_id": str(catalog_attraction_id), "payload": copy_payload}

    missing_fields = sorted({"name"} - payload.keys())
    if missing_fields:
        missing_fields_str = ", ".join(missing_fields)
        raise ValueError(f"Missing required fields: {missing_fields_str}.")

    invalid_fields = sorted(set(payload) - TRIP_SCOPED_MANUAL_FIELDS)
    if invalid_fields:
        invalid_fields_str = ", ".join(invalid_fields)
        raise ValueError(
            "These fields cannot be set through this API: "
            f"{invalid_fields_str}."
        )

    return "manual", {"payload": {"trip_id": trip_id, **payload}}


def _create_and_attach_to_trip(
    repo: SupabaseAttractionRepository,
    trips: TripsClient,
    trip_id: str,
    create_fn,
):
    trip = trips.get_trip(trip_id)
    if trip is None:
        return (
            jsonify({"error": f"Trip {trip_id} was not found"}),
            HTTPStatus.NOT_FOUND,
        )

    attraction = create_fn()
    if attraction is None:
        return (
            jsonify({"error": "Catalog attraction not found"}),
            HTTPStatus.NOT_FOUND,
        )
    try:
        trips.append_attraction_id(trip_id, str(attraction[repo.id_column]))
    except TripsClientError as exc:
        repo.soft_delete_attraction(trip_id, str(attraction[repo.id_column]))
        return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

    return jsonify({"data": attraction}), HTTPStatus.CREATED


def create_app(
    repository: SupabaseAttractionRepository | None = None,
    trips_client: TripsClient | None = None,
) -> Flask:
    app = Flask(__name__)
    repo = repository or SupabaseAttractionRepository()
    trips = trips_client or TripsClient()

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

        try:
            return _create_and_attach_to_trip(
                repo,
                trips,
                str(payload["trip_id"]),
                lambda: repo.create_attraction(payload),
            )
        except TripsClientError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

    @app.post("/api/trips/<trip_id>/attractions")
    def create_attraction_in_trip(trip_id: str):
        try:
            mode, validated = _validate_trip_scoped_create_payload(
                request.get_json(silent=True), trip_id
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        try:
            if mode == "catalog":
                return _create_and_attach_to_trip(
                    repo,
                    trips,
                    trip_id,
                    lambda: repo.create_attraction_from_catalog(
                        trip_id,
                        validated["catalog_attraction_id"],
                        validated["payload"],
                    ),
                )

            return _create_and_attach_to_trip(
                repo,
                trips,
                trip_id,
                lambda: repo.create_attraction(validated["payload"]),
            )
        except TripsClientError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

    @app.post("/api/trips/<trip_id>/attractions/from-catalog")
    def create_attraction_from_catalog(trip_id: str):
        try:
            raw_payload = request.get_json(silent=True)
            payload = _validate_payload(raw_payload) if raw_payload is not None else {}
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        catalog_attraction_id = request.args.get("catalog_attraction_id", type=str)
        if not catalog_attraction_id and payload:
            catalog_attraction_id = payload.get("catalog_attraction_id")
            if catalog_attraction_id:
                payload = {
                    key: value
                    for key, value in payload.items()
                    if key in CATALOG_COPY_OPTIONAL_FIELDS
                }
        else:
            try:
                payload = _validate_catalog_copy_payload(payload)
            except ValueError as exc:
                return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST
        if not catalog_attraction_id:
            return (
                jsonify({"error": "catalog_attraction_id query parameter is required"}),
                HTTPStatus.BAD_REQUEST,
            )

        try:
            return _create_and_attach_to_trip(
                repo,
                trips,
                trip_id,
                lambda: repo.create_attraction_from_catalog(
                    trip_id, catalog_attraction_id, payload
                ),
            )
        except TripsClientError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_GATEWAY

    @app.put("/api/trips/<trip_id>/attractions/<attraction_id>")
    def update_attraction(trip_id: str, attraction_id: str):
        try:
            payload = _validate_update_payload(
                _validate_payload(request.get_json(silent=True))
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        attraction = repo.update_attraction(trip_id, attraction_id, payload)
        if attraction is None:
            return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND
        return jsonify({"data": attraction}), HTTPStatus.OK

    @app.delete("/api/trips/<trip_id>/attractions/<attraction_id>")
    def delete_attraction(trip_id: str, attraction_id: str):
        deleted = repo.soft_delete_attraction(trip_id, attraction_id)
        if deleted is None:
            return jsonify({"error": "Attraction not found"}), HTTPStatus.NOT_FOUND
        return (
            jsonify({"message": "Attraction soft deleted", "data": deleted}),
            HTTPStatus.OK,
        )

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    app.run(debug=True, port=port)
