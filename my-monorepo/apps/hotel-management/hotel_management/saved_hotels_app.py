"""Saved Hotels Microservice Flask App."""
from flask import Flask, jsonify, request
from hotel_management.saved_hotels import saved_hotels_service

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

        hotel = saved_hotels_service.create_hotel(
            name=data.get("name"),
            datetime_check_in=datetime.fromisoformat(data.get("datetime_check_in")) if data.get("datetime_check_in") else None,
            datetime_check_out=datetime.fromisoformat(data.get("datetime_check_out")) if data.get("datetime_check_out") else None,
            trip_id=data.get("trip_id"),
            description=data.get("description"),
            external_link=data.get("external_link"),
            link=data.get("link"),
            overall_rating=data.get("overall_rating"),
            rate_per_night=data.get("rate_per_night"),
            lat=data.get("lat"),
            long=data.get("long"),
            amenities=data.get("amenities"),
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
        )

        if not hotel:
            return jsonify({"error": "Hotel not found"}), 404
        return jsonify({"data": hotel}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>", methods=["DELETE"])
def delete_hotel(hotel_id):
    """DELETE a hotel."""
    try:
        deleted = saved_hotels_service.delete_hotel(hotel_id)
        if not deleted:
            return jsonify({"error": "Hotel not found"}), 404
        return jsonify({"message": "Hotel deleted successfully", "hotel_id": hotel_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
