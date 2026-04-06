from flask import Blueprint, request, jsonify
from ..services.flight_plan_service import FlightPlanService
from ..services.hotel_plan_service import HotelPlanService
from ..utils.api_errors import (
    ExternalServiceError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
)

plan_bp = Blueprint("plan", __name__)


@plan_bp.route("/api/plan/flights/search", methods=["POST"])
def search_flight():
    """
    Search for flights without saving (preview results).

    This endpoint allows frontend to browse flights before selecting one to save.
    Calls flight-management's /api/flights/search endpoint.

    Request Body:
    {
        "origin": "SIN",
        "destination": "HKG",
        "departure_date": "2026-04-15",
        "return_date": "2026-04-20",         // Optional
        "adults": 2,                         // Optional, default 1
        "children": 0,                       // Optional, default 0
        "cabin_class": "economy",            // Optional: economy, business, first
        "currency": "SGD"                    // Optional, default USD
    }

    Response (200 OK):
    {
        "success": true,
        "data": {
            "flights": [...],
            "search_metadata": {...}
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Search flights via service
        service = FlightPlanService()
        result = service.search_flights(data)

        return jsonify({"success": True, "data": result}), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Internal server error: {str(e)}"}
        ), 500


@plan_bp.route("/api/plan/flights/save", methods=["POST"])
def save_flight():
    """
    Save a single flight via flight-management service and update trip metadata.

    This endpoint:
    1. Validates required fields in nested structure
    2. Transforms to flat structure for downstream services
    3. Saves flight via flight-management
    4. Updates trips.flight_ids array (CRITICAL FIX)
    5. Publishes FLIGHT_ADDED event to Redis

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
            "currency": "USD",
            "origin": "SIN",                 // Optional
            "destination": "HKG",            // Optional
            "aircraft_type": "Boeing 737",   // Optional
            "legroom": "32 inches",          // Optional
            "co2_kg": 120.5                  // Optional
        },
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "cost": 778.34
    }

    Response (201 Created):
    {
        "success": true,
        "data": {
            "flight_id": 123
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Validate required top-level fields
        required_fields = ["trip_id", "user_id", "flight_details", "cost"]
        for field in required_fields:
            if field not in data:
                return (
                    jsonify(
                        {"success": False, "error": f"Missing required field: {field}"}
                    ),
                    400,
                )

        # Validate flight_details is a dict
        if not isinstance(data["flight_details"], dict):
            return (
                jsonify(
                    {"success": False, "error": "flight_details must be an object"}
                ),
                400,
            )

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
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Missing required field in flight_details: {field}",
                        }
                    ),
                    400,
                )

        # Transform nested structure to format expected by flight-management
        # flight-management expects: { flight_details: {...}, trip_id, cost }
        flight_management_data = {
            "flight_details": {
                # Required fields
                "flight_number": flight_details["flight_number"],
                "airline": flight_details["airline"],
                "datetime_departure": flight_details["datetime_departure"],
                "datetime_arrival": flight_details["datetime_arrival"],
            },
            # Root level fields
            "trip_id": data["trip_id"],
            "user_id": data["user_id"],
            "cost": data["cost"],
        }

        # Add optional fields to flight_details if present
        optional_fields = [
            "external_link",
            "origin",
            "destination",
            "aircraft_type",
            "legroom",
            "co2_kg",
            "price_sgd",
            "price_usd",
            "currency",
        ]
        for field in optional_fields:
            if field in flight_details:
                flight_management_data["flight_details"][field] = flight_details[field]

        # Save flight via service (includes trip metadata update and Redis publish)
        service = FlightPlanService()
        flight_id = service.save_flight(flight_management_data)

        return jsonify({"success": True, "data": {"flight_id": flight_id}}), 201

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except NotFoundError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Internal server error: {str(e)}"}),
            500,
        )


@plan_bp.route("/api/plan/flights/update", methods=["POST"])
def update_flight():
    """
    Update an existing flight via flight-management service.

    This endpoint:
    1. Validates user has access to trip (member_ids check)
    2. Updates flight in saved-flights service
    3. Publishes FLIGHT_UPDATED event to Redis

    Request Body:
    {
        "flight_id": 123,
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "airline": "Singapore Airlines",     // Optional - any field to update
        "datetime_departure": "2026-04-02T10:00:00",  // Optional
        "cost": 850.00                       // Optional
    }

    Response (200 OK):
    {
        "success": true,
        "data": {
            "flight_id": 123,
            "airline": "Singapore Airlines",
            "datetime_departure": "2026-04-02T10:00:00",
            ...
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Update flight via service
        service = FlightPlanService()
        result = service.update_flight(data)

        return jsonify({"success": True, "data": result}), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except UnauthorizedError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except NotFoundError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Internal server error: {str(e)}"}),
            500,
        )


@plan_bp.route("/api/plan/flights/delete", methods=["POST"])
def delete_flight():
    """
    Soft delete a flight via flight-management service.

    This endpoint:
    1. Validates user has access to trip (member_ids check)
    2. Fetches full flight data before deletion
    3. Soft deletes flight in saved-flights service
    4. Publishes FLIGHT_DELETED event to Redis with full flight data

    Request Body:
    {
        "flight_id": af785df5-5882-418e-a6ae-9dfcf04b1faf,
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000"
    }

    Response (200 OK):
    {
        "success": true,
        "data": {
            "deleted_flight": {
                "flight_id": 123,
                "airline": "AirAsia",
                "flight_number": "1796",
                ...
            },
            "message": "Flight deleted successfully"
        }
    }

    Error Responses:
    - 400: Missing required fields or validation errors
    - 403: User not authorized (not in trip's member_ids)
    - 404: Trip or flight not found
    - 503: Downstream services unavailable
    - 500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Delete flight via service
        service = FlightPlanService()
        result = service.delete_flight(data)

        return jsonify({"success": True, "data": result}), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except UnauthorizedError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except NotFoundError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Internal server error: {str(e)}"}),
            500,
        )


@plan_bp.route("/api/plan/hotels/search", methods=["POST"])
def search_hotels():
    """
    Search for hotels without saving (preview results).

    This endpoint allows frontend to browse hotels before selecting one to save.
    Calls hotel-management's /api/search endpoint.

    Request Body:
    {
        "query": "hotels near Singapore",
        "check_in_date": "2026-04-15",
        "check_out_date": "2026-04-17",
        "adults": 2,
        "children": 0,
        "currency": "SGD",
        "hl": "en",
        "sort_by": 3,         // Optional: 3=price, 8=rating, 13=reviews
        "rating": 8           // Optional: 7=3.5+, 8=4.0+, 9=4.5+
    }

    Response (200 OK):
    {
        "success": true,
        "data": {
            "search_results": {
                "properties": [
                    {
                        "name": "Marina Bay Sands",
                        "rate_per_night": {...},
                        "overall_rating": 4.8,
                        "amenities": [...],
                        "photos": [...],
                        ...
                    }
                ],
                ...
            },
            "status": "success"
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Search hotels via service
        service = HotelPlanService()
        result = service.search_hotels(data)

        return jsonify({"success": True, "data": result}), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Internal server error: {str(e)}"}
        ), 500


@plan_bp.route("/api/plan/hotels/save", methods=["POST"])
def save_hotel():
    """
    Save a pre-selected hotel to the database and update trip.

    Frontend should:
    1. Call /api/plan/hotels/search to get hotel options
    2. User selects a hotel from search results
    3. Call this endpoint with full hotel data

    Request Body:
    {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "hotel": {
            "name": "Marina Bay Sands",
            "check_in_date": "2025-04-15",
            "check_out_date": "2025-04-17",
            "description": "Luxury hotel with iconic rooftop infinity pool",
            "external_link": "https://www.marinabaysands.com",
            "link": "marina-bay-sands-token",
            "overall_rating": 4.8,
            "rate_per_night": 450.00,
            "lat": 1.2834,
            "long": 103.8607,
            "amenities": ["Pool", "WiFi", "Gym"],
            "photos": ["url1", "url2", "url3"],
            "address": "10 Bayfront Ave, Singapore 018956"
        }
    }

    Response (201 Created):
    {
        "success": true,
        "data": {
            "hotel": {
                "hotel_id": "uuid-string",
                "name": "Marina Bay Sands",
                ...
            },
            "trip": {
                "id": "trip-uuid",
                "hotel_ids": ["hotel-1", "hotel-2", "new-hotel-id"],
                ...
            }
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Save hotel and update trip via service
        service = HotelPlanService()
        result = service.save_hotel(data)

        return jsonify({"success": True, "data": result}), 201

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except NotFoundError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Internal server error: {str(e)}"}
        ), 500


@plan_bp.route("/api/plan/hotels/update", methods=["POST"])
def update_hotel():
    return


@plan_bp.route("/api/plan/hotels/delete", methods=["POST"])
def delete_hotel():
    """
    Delete hotels from a trip via hotel-management service

    This endpoint:
    1. Validates user has access to trip (member_ids check)
    2. Fetches full hotel data before deletion
    3. Removes hotel_ids from trip's hotel_ids array
    4. Soft deletes hotels in saved-hotels service
    5. Publishes HOTEL_DELETED event to Redis with full hotel data

    Request Body:
    {
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "hotel_ids": ["hotel-uuid-1", "hotel-uuid-2"],
        "user_id": "123e4567-e89b-12d3-a456-426614174000"
    }

    Response (200 OK):
    {
        "success": true,
        "data": {
            "deleted_hotels": [
                {
                    "hotel_id": "hotel-uuid-1",
                    "name": "Hotel Name",
                    "description": "...",
                    ...
                }
            ],
            "trip": {
                "id": "trip-uuid",
                "hotel_ids": ["remaining-hotel-ids"],
                ...
            },
            "deleted_count": 2,
            "message": "Hotels deleted successfully"
        }
    }

    Error Responses:
    - 400: Missing required fields or validation errors
    - 403: User not authorized (not in trip's member_ids)
    - 404: Trip not found
    - 503: Downstream services unavailable
    - 500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "Request body is required"}), 400

        # Delete hotels via service
        service = HotelPlanService()
        result = service.delete_hotels(data)

        return jsonify({"success": True, "data": result}), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except UnauthorizedError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except NotFoundError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except ExternalServiceError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code

    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Internal server error: {str(e)}"}
        ), 500


@plan_bp.route("/api/plan/attractions/save", methods=["POST"])
def save_attraction():
    return


@plan_bp.route("/api/plan/attractions/update", methods=["POST"])
def update_attraction():
    return


@plan_bp.route("/api/plan/attractions/delete", methods=["POST"])
def delete_attraction():
    return
