"""Hotel Management Composite Microservice Flask App."""
from flask import Flask, jsonify, request
try:
    from hotel_management_service import hotel_management_service
except ImportError:
    from .hotel_management_service import hotel_management_service

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": hotel_management_service.health_check()})


@app.route("/api/search", methods=["POST"])
def search_hotels():
    """Search for hotels without saving to the database."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Support both 'query' and 'city' parameters
        city = data.get("city")
        query = data.get("query")

        # Default query is "hotels near {city}" if city is provided
        if city:
            query = f"hotels near {city}"

        check_in_date = data.get("check_in_date")
        check_out_date = data.get("check_out_date")

        if not query or not check_in_date or not check_out_date:
            return jsonify({"error": "query (or city), check_in_date, and check_out_date are required"}), 400

        result = hotel_management_service.search_hotels(
            query=query,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            adults=data.get("adults", 2),
            children=data.get("children", 0),
            currency=data.get("currency", "SGD"),
            hl=data.get("hl", "en"),
            sort_by=data.get("sort_by"),
            rating=data.get("rating"),
        )

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/save-hotel", methods=["POST"])
def save_hotel():
    """Save a selected hotel to the database."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Get required fields
        uid = data.get("uid")
        trip_id = data.get("trip_id")
        hotel_data = data.get("hotel")

        if not uid or not trip_id or not hotel_data:
            return jsonify({"error": "uid, trip_id, and hotel data are required"}), 400

        result = hotel_management_service.save_hotel_to_database(
            uid=uid,
            trip_id=trip_id,
            hotel_data=hotel_data,
        )

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>", methods=["GET"])
def get_hotel_details(hotel_id):
    """Get hotel details by hotel ID."""
    try:
        if not hotel_id:
            return jsonify({"error": "hotel_id is required"}), 400

        result = hotel_management_service.get_hotel_by_id(hotel_id)

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        if not result.get("hotel"):
            return jsonify({"error": "Hotel not found"}), 404

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>/fetch-latest-price", methods=["POST"])
def fetch_latest_price(hotel_id):
    """Fetch the latest price for a hotel and update it in the database."""
    try:
        if not hotel_id:
            return jsonify({"error": "hotel_id is required"}), 400

        result = hotel_management_service.fetch_latest_price(hotel_id)

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotel/delete", methods=["POST"])
def soft_delete_hotels_from_trip():
    """Soft delete multiple hotels from a specific trip."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        trip_id = data.get("trip_id")
        hotel_ids = data.get("hotel_ids")

        if not trip_id:
            return jsonify({"error": "trip_id is required"}), 400

        if not hotel_ids:
            return jsonify({"error": "hotel_ids is required"}), 400

        if not isinstance(hotel_ids, list):
            return jsonify({"error": "hotel_ids must be an array"}), 400

        result = hotel_management_service.soft_delete_hotels_from_trip(
            trip_id=trip_id,
            hotel_ids=hotel_ids,
        )

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
