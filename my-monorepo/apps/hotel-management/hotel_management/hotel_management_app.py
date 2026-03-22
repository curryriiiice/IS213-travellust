"""Hotel Management Composite Microservice Flask App."""
from flask import Flask, jsonify, request
from hotel_management.hotel_management_service import hotel_management_service

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": hotel_management_service.health_check()})


@app.route("/api/search-and-save", methods=["POST"])
def search_and_save_hotel():
    """Search for hotels and optionally save the first result to the database."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        query = data.get("query")
        check_in_date = data.get("check_in_date")
        check_out_date = data.get("check_out_date")
        trip_id = data.get("trip_id")

        if not query or not check_in_date or not check_out_date or not trip_id:
            return jsonify({"error": "query, check_in_date, check_out_date, and trip_id are required"}), 400

        result = hotel_management_service.search_and_save_hotel(
            query=query,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            trip_id=trip_id,
            adults=data.get("adults", 2),
            children=data.get("children", 0),
            currency=data.get("currency", "SGD"),
            gl=data.get("gl", "sg"),
            hl=data.get("hl", "en"),
            sort_by=data.get("sort_by"),
            rating=data.get("rating"),
            save_to_database=data.get("save_to_database", True),
        )

        if result.get("status") == "error":
            return jsonify({"error": result.get("error")}), 500

        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
