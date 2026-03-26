import os
import json
from datetime import datetime
from typing import Optional
import redis

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "redis"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            decode_responses=True
        )
    return _redis_client


def publish_event(trip_id: str, event_type: str, data: dict, user_id: str = None, user_name: str = None):
    """Publish event to Redis channel for a trip."""
    channel = f"trip:{trip_id}"
    payload = {
        "type": event_type,
        "trip_id": trip_id,
        "data": data,
        "user_id": user_id,
        "user_name": user_name,
        "timestamp": datetime.utcnow().isoformat()
    }

    client = get_redis_client()
    client.publish(channel, json.dumps(payload, default=str))
