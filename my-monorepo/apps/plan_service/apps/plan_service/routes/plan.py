from flask import Blueprint, request, jsonify
from ..services.flight_plan_service import FlightPlanService
from ..utils.api_errors import ExternalServiceError

plan_bp = Blueprint("plan", __name__)


@plan_bp.route("/api/plan/flights/save", methods=["POST"])
def save_flight():
    """
    Save a single flight via flight-management service

    Request Body:
    {
        "flight_details": {
            "airline": "AirAsia",
            "datetime_arrival": "2026-04-08T23:25:00",
            "datetime_departure": "2026-04-01T17:55:00",
            "external_link": "https://www.google.com/travel/flights",
            "flight_number": "1796",
            "price_sgd": 778.34,
            "price_usd": 580.85,
            "currency": "USD"
        },
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "cost": 778.34
    }

    Response:
    {
        "success": true,
        "data": {
            "flight_id": "uuid-string"
        }
    }
    """
    try:
        data = request.get_json()

        # Validate required top-level fields
        required_fields = ["trip_id", "user_id", "flight_details", "cost"]
        for field in required_fields:
            if field not in data:
                return jsonify(
                    {"success": False, "error": f"Missing required field: {field}"}
                ), 400

        # Validate flight_details is a dict
        if not isinstance(data["flight_details"], dict):
            return jsonify(
                {"success": False, "error": "flight_details must be an object"}
            ), 400

        # Validate required fields in flight_details
        required_flight_fields = [
            "airline",
            "datetime_departure",
            "datetime_arrival",
            "flight_number",
        ]
        flight_details = data["flight_details"]
        for field in required_flight_fields:
            if field not in flight_details:
                return jsonify(
                    {
                        "success": False,
                        "error": f"Missing required field in flight_details: {field}",
                    }
                ), 400

        # Transform nested structure to flat structure for downstream services
        # The saved-flights service expects: flight_number, airline,
        # datetime_departure, datetime_arrival, external_link (optional),
        # trip_id, user_id, cost
        flat_data = {
            # From flight_details
            "flight_number": flight_details["flight_number"],
            "airline": flight_details["airline"],
            "datetime_departure": flight_details["datetime_departure"],
            "datetime_arrival": flight_details["datetime_arrival"],
            # From root level
            "trip_id": data["trip_id"],
            "user_id": data["user_id"],
            "cost": data["cost"],
        }

        # Add optional fields from flight_details if present
        if "external_link" in flight_details:
            flat_data["external_link"] = flight_details["external_link"]

        # Save flight via service
        service = FlightPlanService()
        flight_id = service.save_flight(flat_data)

        return jsonify({"success": True, "data": {"flight_id": flight_id}}), 201

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500
