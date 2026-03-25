import os
import redis
from typing import Optional

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "redis"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            decode_responses=True,
        )
    return _redis_client


def publish_event(channel: str, message: dict) -> None:
    """Publish event to Redis channel."""
    import json

    client = get_redis_client()
    client.publish(channel, json.dumps(message))


def subscribe_to_channel(channel: str):
    """Subscribe to Redis channel for listening."""
    client = get_redis_client()
    pubsub = client.pubsub()
    pubsub.subscribe(channel)
    return pubsub
