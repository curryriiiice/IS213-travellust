"""Book Hotels Composite Microservice Flask App."""
from flask import Flask, jsonify, request
from book_hotels.book_hotels_service import book_hotels_service

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": book_hotels_service.health_check()})


@app.route("/api/book-hotel", methods=["POST"])
def book_hotel():
    """Book a hotel for a trip."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Get required fields
        trip_id = data.get("trip_id")
        user_id = data.get("user_id")
        ticket_holder_userids = data.get("ticket_holder_userids")
        hotel_id = data.get("hotel_id")

        if not trip_id or not user_id or not hotel_id:
            return jsonify({"error": "trip_id, user_id, and hotel_id are required"}), 400

        if not isinstance(ticket_holder_userids, list):
            return jsonify({"error": "ticket_holder_userids must be an array"}), 400

        result = book_hotels_service.book_hotel(
            trip_id=trip_id,
            user_id=user_id,
            ticket_holder_userids=ticket_holder_userids,
            hotel_id=hotel_id,
        )

        if result.get("status") == "error":
            return jsonify({"error": result.get("message")}), 500

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/verify-hotel-ownership", methods=["POST"])
def verify_hotel_ownership():
    """Verify if a hotel belongs to a trip."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        trip_id = data.get("trip_id")
        hotel_id = data.get("hotel_id")

        if not trip_id or not hotel_id:
            return jsonify({"error": "trip_id and hotel_id are required"}), 400

        result = book_hotels_service.verify_hotel_ownership(trip_id, hotel_id)

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotels/<hotel_id>/details", methods=["GET"])
def get_hotel_details(hotel_id):
    """Get hotel details with latest price."""
    try:
        if not hotel_id:
            return jsonify({"error": "hotel_id is required"}), 400

        result = book_hotels_service.get_hotel_details_with_latest_price(hotel_id)

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5002)
