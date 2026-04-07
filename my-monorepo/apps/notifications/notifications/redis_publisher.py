"""Redis publisher for real-time notification delivery."""
from __future__ import annotations

import json
import os
import logging
from datetime import datetime

import redis

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True
        )
    return _redis_client


def publish_notification(user_id: str, notification: dict) -> bool:
    """
    Publish a notification to the user's Redis channel.
    
    Args:
        user_id: The target user's ID
        notification: The notification data to publish
        
    Returns:
        True if published successfully, False otherwise
    """
    try:
        client = get_redis_client()
        channel = f"user:{user_id}"
        
        payload = {
            "type": "NOTIFICATION",
            "user_id": user_id,
            "data": notification,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        client.publish(channel, json.dumps(payload, default=str))
        logger.info("Published notification to channel %s", channel)
        return True
    except redis.RedisError as e:
        logger.error("Failed to publish notification to Redis: %s", e)
        return False
