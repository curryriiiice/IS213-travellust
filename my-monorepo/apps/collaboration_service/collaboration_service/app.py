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
# Track user connections for notification delivery
user_connections = {}

PERSISTENT_EVENT_TYPES = {
    "FLIGHT_ADDED",
    "FLIGHT_DELETED",
    "HOTEL_ADDED",
    "HOTEL_DELETED",
    "ATTRACTION_ADDED",
    "ATTRACTION_UPDATED",
    "ATTRACTION_DELETED",
}


def build_description(event_type: str, payload: dict) -> str:
    """Build a human-readable description from the event type and its payload."""
    if event_type == "FLIGHT_ADDED":
        name = (
            f"{payload.get('airline', '')} {payload.get('flight_number', '')}".strip()
            or "Flight"
        )
        return f"{name} added"
    if event_type == "FLIGHT_UPDATED":
        name = (
            f"{payload.get('airline', '')} {payload.get('flight_number', '')}".strip()
            or "Flight"
        )
        return f"{name} updated"
    if event_type == "FLIGHT_DELETED":
        deleted = payload.get("deleted_flight") or {}
        name = (
            f"{deleted.get('airline', '')} {deleted.get('flight_number', '')}".strip()
            or "Flight"
        )
        return f"{name} removed"
    if event_type == "HOTEL_ADDED":
        return f"{payload.get('name', 'Hotel')} added"
    if event_type == "HOTEL_DELETED":
        hotels = payload.get("deleted_hotels") or []
        name = hotels[0].get("name", "Hotel") if hotels else "Hotel"
        return f"{name} removed"
    if event_type == "ATTRACTION_ADDED":
        return f"{payload.get('name', 'Attraction')} added"
    if event_type == "ATTRACTION_UPDATED":
        return f"{payload.get('name', 'Attraction')} updated"
    if event_type == "ATTRACTION_DELETED":
        deleted = payload.get("deleted_attraction") or {}
        return f"{deleted.get('name', 'Attraction')} removed"
    return event_type


def verify_user_access(trip_id: str, user_id: str) -> bool:
    """Verify user is allowed to access this trip."""
    if not supabase:
        return True

    response = supabase.table("trips").select("member_ids").eq("id", trip_id).execute()

    if not response.data:
        return False

    user_ids = response.data[0].get("member_ids", [])
    return user_id in user_ids if user_ids else True


def get_trip_users(trip_id: str) -> list:
    """Get list of active users in a trip room."""
    return list(active_users.get(trip_id, {}).keys())


@socketio.on("connect")
def handle_connect():
    trip_id = request.args.get(
        "trip_id"
    )  # Optional - can be None for notification-only connections
    user_id = request.args.get("user_id")  # Required

    # user_id is always required
    if not user_id:
        emit("error", {"message": "user_id is required"})
        return False

    # Always join the user's personal room for notifications
    user_room = f"user:{user_id}"
    join_room(user_room)

    # Track user connection
    if user_id not in user_connections:
        user_connections[user_id] = set()
    user_connections[user_id].add(request.sid)

    print(f"User {user_id} joined notification room {user_room}")

    # If trip_id is provided, also join the trip room (existing behavior)
    if trip_id:
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
    else:
        # Notification-only connection
        emit(
            "connected",
            {
                "user_id": user_id,
                "notification_room": user_room,
            },
        )


@socketio.on("disconnect")
def handle_disconnect():
    trip_id = request.args.get("trip_id")
    user_id = request.args.get("user_id")

    if user_id:
        # Leave user notification room
        user_room = f"user:{user_id}"
        leave_room(user_room)

        # Remove from user_connections tracking
        if user_id in user_connections:
            user_connections[user_id].discard(request.sid)
            if not user_connections[user_id]:
                del user_connections[user_id]

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


@app.route("/api/trip/<trip_id>/activity")
def get_trip_activity(trip_id):
    """Return the last 50 persisted activity entries for a trip, newest first."""
    if not supabase:
        return jsonify({"data": [], "error": "Supabase not configured"}), 503

    try:
        response = (
            supabase.table("trip_activity")
            .select("id, trip_id, event_type, user_id, description, created_at")
            .eq("trip_id", trip_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return jsonify({"data": response.data})
    except Exception as e:
        print(f"Error fetching trip activity: {e}")
        return jsonify({"error": "Failed to fetch activity"}), 500


def start_redis_listener():
    """Background thread to listen to Redis and broadcast to WebSocket."""

    def listen():
        redis_client = get_redis_client()
        pubsub = redis_client.pubsub()
        # Subscribe to both trip events and user notification events
        pubsub.psubscribe("trip:*", "user:*")

        for message in pubsub.listen():
            try:
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    data = json.loads(message["data"])

                    # Handle trip events (existing behavior)
                    if channel.startswith("trip:"):
                        trip_id = channel.split(":")[-1]
                        print(f"Broadcasting trip_update to room {trip_id}")
                        socketio.emit("trip_update", data, room=trip_id)

                        event_type = data.get("type", "")
                        if supabase and event_type in PERSISTENT_EVENT_TYPES:
                            try:
                                supabase.table("trip_activity").insert(
                                    {
                                        "trip_id": trip_id,
                                        "event_type": event_type,
                                        "user_id": data.get("user_id") or None,
                                        "description": build_description(
                                            event_type, data.get("data") or {}
                                        ),
                                        "payload": data.get("data") or {},
                                        "created_at": data.get(
                                            "timestamp", datetime.utcnow().isoformat()
                                        ),
                                    }
                                ).execute()
                            except Exception as db_err:
                                print(f"Failed to persist activity log entry: {db_err}")

                    # Handle user notification events (NEW)
                    elif channel.startswith("user:"):
                        user_id = channel.split(":")[-1]
                        user_room = f"user:{user_id}"
                        print(f"Broadcasting notification to user room {user_room}")
                        # Emit the notification data directly
                        notification_data = data.get("data", data)
                        socketio.emit("notification", notification_data, room=user_room)

            except json.JSONDecodeError as e:
                print(f"Invalid JSON in Redis message: {e}")
            except Exception as e:
                print(f"Error processing Redis message: {e}")

    threading.Thread(target=listen, daemon=True).start()


if __name__ == "__main__" or __name__ == "collaboration_service.app":
    start_redis_listener()
    port = int(os.getenv("PORT", "5010"))
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
