from flask import Flask, jsonify, request

from .supabase_client import supabase

app = Flask(__name__)


@app.route("/api/<table>", methods=["GET"])
def get_all(table):
    """GET all records from a table."""
    response = supabase.table(table).select("*").execute()
    return jsonify({"data": response.data, "count": len(response.data)})


@app.route("/api/<table>/<id>", methods=["GET"])
def get_by_id(table, id):
    """GET a single record by ID."""
    response = supabase.table(table).select("*").eq("id", id).execute()
    if not response.data:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"data": response.data[0]})


@app.route("/api/<table>", methods=["POST"])
def create(table):
    """POST/Create a new record."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    response = supabase.table(table).insert(data).execute()
    return jsonify({"data": response.data[0]}), 201


@app.route("/api/<table>/<id>", methods=["PUT"])
def update(table, id):
    """PUT/Update an existing record."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    response = supabase.table(table).update(data).eq("id", id).execute()
    if not response.data:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"data": response.data[0]})


@app.route("/api/<table>/<id>", methods=["DELETE"])
def delete(table, id):
    """DELETE a record."""
    response = supabase.table(table).delete().eq("id", id).execute()
    if not response.data:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"message": "Record deleted", "data": response.data[0]})


if __name__ == "__main__":
    app.run(debug=True)
