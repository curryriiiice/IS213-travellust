import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from .supabase_client import supabase
from .redis_client import get_redis_client, subscribe_to_channel
import threading

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

active_users = {}


def verify_user_access(trip_id: str, user_id: str) -> bool:
    """Verify user is allowed to access this trip."""
    if not supabase:
        return True

    response = (
        supabase.table("trips").select("member_ids").eq("id", trip_id).execute()
    )

    if not response.data:
        return False

    user_ids = response.data[0].get("member_ids", [])
    return user_id in user_ids if user_ids else True


def get_trip_users(trip_id: str) -> list:
    """Get list of active users in a trip room."""
    return list(active_users.get(trip_id, {}).keys())


@socketio.on("connect")
def handle_connect():
    trip_id = request.args.get("trip_id")
    user_id = request.args.get("user_id")

    if not trip_id or not user_id:
        emit("error", {"message": "trip_id and user_id required"})
        return False

    if not verify_user_access(trip_id, user_id):
        emit("error", {"message": "Access denied"})
        return False

    join_room(trip_id)
    if trip_id not in active_users:
        active_users[trip_id] = {}
    active_users[trip_id][user_id] = {"joined_at": datetime.utcnow().isoformat()}

    emit(
        "user_joined",
        {"user_id": user_id, "active_users": get_trip_users(trip_id)},
        room=trip_id,
        include_self=False,
    )

    emit(
        "connected",
        {
            "trip_id": trip_id,
            "user_id": user_id,
            "active_users": get_trip_users(trip_id),
        },
    )


@socketio.on("disconnect")
def handle_disconnect():
    trip_id = request.args.get("trip_id")
    user_id = request.args.get("user_id")

    if trip_id and user_id:
        leave_room(trip_id)
        if trip_id in active_users and user_id in active_users[trip_id]:
            del active_users[trip_id][user_id]

        emit(
            "user_left",
            {"user_id": user_id, "active_users": get_trip_users(trip_id)},
            room=trip_id,
            include_self=False,
        )


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/trip/<trip_id>/members")
def get_trip_members(trip_id):
    """Get active members in a trip."""
    return jsonify({"trip_id": trip_id, "members": get_trip_users(trip_id)})


EVENT_SUMMARIES = {
    "FLIGHT_ADDED": ("added a flight", "flight"),
    "FLIGHT_UPDATED": ("updated a flight", "flight"),
    "FLIGHT_DELETED": ("removed a flight", "flight"),
    "HOTEL_ADDED": ("added a hotel", "hotel"),
    "HOTEL_UPDATED": ("updated a hotel", "hotel"),
    "HOTEL_DELETED": ("removed a hotel", "hotel"),
    "ATTRACTION_ADDED": ("added an attraction", "attraction"),
    "ATTRACTION_UPDATED": ("updated an attraction", "attraction"),
    "ATTRACTION_DELETED": ("removed an attraction", "attraction"),
    "NODE_ADDED": ("added an item", "node"),
    "NODE_UPDATED": ("updated an item", "node"),
    "NODE_DELETED": ("removed an item", "node"),
}


def build_activity_summary(data: dict) -> dict:
    event_type = data.get("type", "")
    verb, node_type = EVENT_SUMMARIES.get(event_type, ("updated the trip", "trip"))
    inner = data.get("data", {})
    item_name = (
        inner.get("title")
        or inner.get("flight_number")
        or inner.get("hotel_name")
        or inner.get("name")
        or ""
    )
    user_name = data.get("user_name") or data.get("user_id") or "Someone"
    return {
        "user_id": data.get("user_id"),
        "user_name": user_name,
        "event": event_type,
        "verb": verb,
        "node_type": node_type,
        "item_name": item_name,
        "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
    }


def start_redis_listener():
    """Background thread to listen to Redis and broadcast to WebSocket."""

    def listen():

        redis_client = get_redis_client()
        pubsub = redis_client.pubsub()
        pubsub.psubscribe("trip:*")

        for message in pubsub.listen():
            try:
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    trip_id = channel.split(":")[-1]
                    data = json.loads(message["data"])
                    print(f"Broadcasting trip_update to room {trip_id}")
                    socketio.emit("trip_update", data, room=trip_id)
                    socketio.emit(
                        "activity_log",
                        build_activity_summary(data),
                        room=trip_id,
                    )
            except json.JSONDecodeError as e:
                print(f"Invalid JSON in Redis message: {e}")
            except Exception as e:
                print(f"Error processing Redis message: {e}")

    threading.Thread(target=listen, daemon=True).start()


if __name__ == "__main__" or __name__ == "collaboration_service.app":
    start_redis_listener()
    port = int(os.getenv("PORT", "5010"))
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)
