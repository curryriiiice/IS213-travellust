"""Saved Hotels Microservice Flask App."""
from flask import Flask, jsonify, request
try:
    from saved_hotels import saved_hotels_service
except ImportError:
    from .saved_hotels import saved_hotels_service

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": saved_hotels_service.health_check()})


@app.route("/api/hotels", methods=["GET"])
def get_all_hotels():
    """GET all saved hotels."""
    try:
        hotels = saved_hotels_service.get_all_hotels()
        return jsonify({"data": hotels, "count": len(hotels)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>", methods=["GET"])
def get_hotel(hotel_id):
    """GET a single hotel by ID."""
    try:
        hotel = saved_hotels_service.get_hotel(hotel_id)
        if not hotel:
            return jsonify({"error": "Hotel not found"}), 404
        return jsonify({"data": hotel}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/trip/<trip_id>", methods=["GET"])
def get_hotels_by_trip(trip_id):
    """GET all hotels for a specific trip."""
    try:
        hotels = saved_hotels_service.get_hotels_by_trip(trip_id)
        return jsonify({"data": hotels, "count": len(hotels)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels", methods=["POST"])
def create_hotel():
    """POST/Create a new hotel."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        from datetime import datetime

        # Handle hotel-management format (hotel object nested) or direct format
        hotel_data = data.get("hotel", {})
        trip_id = data.get("trip_id") or hotel_data.get("trip_id")

        # Convert date strings to datetime objects
        check_in_str = hotel_data.get("datetime_check_in") or hotel_data.get("check_in_date")
        check_out_str = hotel_data.get("datetime_check_out") or hotel_data.get("check_out_date")

        datetime_check_in = datetime.fromisoformat(check_in_str) if check_in_str else None
        datetime_check_out = datetime.fromisoformat(check_out_str) if check_out_str else None

        hotel = saved_hotels_service.create_hotel(
            name=hotel_data.get("name"),
            datetime_check_in=datetime_check_in,
            datetime_check_out=datetime_check_out,
            trip_id=trip_id,
            description=hotel_data.get("description"),
            external_link=hotel_data.get("external_link"),
            link=hotel_data.get("link"),
            overall_rating=hotel_data.get("overall_rating"),
            rate_per_night=hotel_data.get("rate_per_night"),
            lat=hotel_data.get("lat"),
            long=hotel_data.get("long"),
            amenities=hotel_data.get("amenities"),
            photos=hotel_data.get("photos"),
            address=hotel_data.get("address"),
        )

        return jsonify({"data": hotel}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>", methods=["PUT"])
def update_hotel(hotel_id):
    """PUT/Update an existing hotel."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        from datetime import datetime

        hotel = saved_hotels_service.update_hotel(
            hotel_id=hotel_id,
            name=data.get("name"),
            description=data.get("description"),
            datetime_check_in=datetime.fromisoformat(data.get("datetime_check_in")) if data.get("datetime_check_in") else None,
            datetime_check_out=datetime.fromisoformat(data.get("datetime_check_out")) if data.get("datetime_check_out") else None,
            external_link=data.get("external_link"),
            link=data.get("link"),
            overall_rating=data.get("overall_rating"),
            rate_per_night=data.get("rate_per_night"),
            lat=data.get("lat"),
            long=data.get("long"),
            amenities=data.get("amenities"),
            photos=data.get("photos"),
            address=data.get("address"),
        )

        if not hotel:
            return jsonify({"error": "Hotel not found"}), 404
        return jsonify({"data": hotel}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/soft-delete", methods=["POST"])
def soft_delete_hotels():
    """Soft delete multiple hotels by setting deleted attribute to true."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        hotel_ids = data.get("hotel_ids")
        if not hotel_ids:
            return jsonify({"error": "hotel_ids is required"}), 400

        if not isinstance(hotel_ids, list):
            return jsonify({"error": "hotel_ids must be an array"}), 400

        deleted_hotels = saved_hotels_service.soft_delete_hotels(hotel_ids)
        return jsonify({
            "message": "Hotels soft deleted successfully",
            "deleted_count": len(deleted_hotels),
            "deleted_hotel_ids": deleted_hotels,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
