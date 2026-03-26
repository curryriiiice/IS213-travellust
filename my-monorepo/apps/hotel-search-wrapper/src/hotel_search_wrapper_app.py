"""Hotel Search Wrapper Microservice Flask App."""
from flask import Flask, jsonify, request
try:
    from hotel_search_wrapper import hotel_search_service
except ImportError:
    from .hotel_search_wrapper import hotel_search_service

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": hotel_search_service.health_check()})


@app.route("/api/search", methods=["POST"])
def search_hotels():
    """Search for hotels."""
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

        results = hotel_search_service.search_hotels(
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

        return jsonify({"data": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
