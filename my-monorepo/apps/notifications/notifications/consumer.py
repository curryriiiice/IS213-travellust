from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any

import pika

from .supabase_client import supabase
from .redis_publisher import publish_notification

logger = logging.getLogger(__name__)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
EXCHANGE_NAME = "travellust_notifications"
ROUTING_KEYS = [
    "booking.success",
    "booking.failure",
    "payment.success",
    "payment.failure",
]


def _build_notification_content(routing_key: str, data: dict) -> dict[str, Any]:
    """Build notification title and message from event data."""
    service = data.get("service", "")
    
    if routing_key == "booking.success":
        if service == "book-attractions":
            title = "Attraction Booked"
            message = f"Successfully booked {data.get('attraction_name', 'attraction')}"
        elif service == "book-flight":
            title = "Flight Booked"
            message = f"Successfully booked flight for your trip"
        elif service == "book-hotels":
            title = "Hotel Booked"
            message = f"Successfully booked hotel for your trip"
        else:
            title = "Booking Confirmed"
            message = "Your booking has been confirmed"
    
    elif routing_key == "booking.failure":
        reason = data.get("reason", "Unknown error")
        if service == "book-attractions":
            title = "Attraction Booking Failed"
            message = f"Failed to book {data.get('attraction_name', 'attraction')}: {reason}"
        elif service == "book-flight":
            title = "Flight Booking Failed"
            message = f"Failed to book flight: {reason}"
        elif service == "book-hotels":
            title = "Hotel Booking Failed"
            message = f"Failed to book hotel: {reason}"
        else:
            title = "Booking Failed"
            message = f"Your booking failed: {reason}"
    
    elif routing_key == "payment.success":
        amount = data.get("amount", "")
        title = "Payment Successful"
        message = f"Payment of ${amount} has been processed" if amount else "Payment has been processed"
    
    elif routing_key == "payment.failure":
        reason = data.get("reason", "Unknown error")
        title = "Payment Failed"
        message = f"Payment failed: {reason}"
    
    else:
        title = "Notification"
        message = "You have a new notification"
    
    return {"title": title, "message": message}


def _persist_notification(user_id: str, routing_key: str, data: dict) -> dict | None:
    """Persist notification to Supabase and return the created record."""
    if not supabase:
        logger.warning("Supabase not configured, skipping persistence")
        return None
    
    content = _build_notification_content(routing_key, data)
    
    notification_data = {
        "user_id": user_id,
        "trip_id": data.get("trip_id"),
        "type": routing_key,
        "title": content["title"],
        "message": content["message"],
        "payload": data,
        "is_read": False,
    }
    
    try:
        response = supabase.table("notifications").insert(notification_data).execute()
        if response.data:
            logger.info("Persisted notification for user %s", user_id)
            return response.data[0]
        return None
    except Exception as e:
        logger.error("Failed to persist notification: %s", e)
        return None


def _process_notification(routing_key: str, data: dict) -> None:
    """Process notification: persist to DB and publish to Redis for real-time delivery."""
    # Get user_ids - can be a list or single value
    user_ids = data.get("user_id", [])
    if not isinstance(user_ids, list):
        user_ids = [user_ids]
    
    for user_id in user_ids:
        if not user_id:
            continue
        
        # Persist to Supabase
        notification = _persist_notification(str(user_id), routing_key, data)
        
        # Publish to Redis for real-time delivery
        if notification:
            publish_notification(str(user_id), notification)


def _handle_booking_success(data: dict) -> None:
    logger.info(
        "[NOTIFICATION] Booking successful | user_id=%s booking_id=%s",
        data.get("user_id"),
        data.get("booking_id"),
    )
    _process_notification("booking.success", data)


def _handle_booking_failure(data: dict) -> None:
    logger.warning(
        "[NOTIFICATION] Booking failed | user_id=%s reason=%s",
        data.get("user_id"),
        data.get("reason"),
    )
    _process_notification("booking.failure", data)


def _handle_payment_success(data: dict) -> None:
    logger.info(
        "[NOTIFICATION] Payment successful | user_id=%s amount=%s",
        data.get("user_id"),
        data.get("amount"),
    )
    _process_notification("payment.success", data)


def _handle_payment_failure(data: dict) -> None:
    logger.warning(
        "[NOTIFICATION] Payment failed | user_id=%s reason=%s",
        data.get("user_id"),
        data.get("reason"),
    )
    _process_notification("payment.failure", data)


HANDLERS = {
    "booking.success": _handle_booking_success,
    "booking.failure": _handle_booking_failure,
    "payment.success": _handle_payment_success,
    "payment.failure": _handle_payment_failure,
}


def _on_message(channel, method, _properties, body):
    routing_key = method.routing_key
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        logger.error("Invalid JSON received on routing key %s", routing_key)
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    handler = HANDLERS.get(routing_key)
    if handler:
        try:
            handler(data)
        except Exception:
            logger.exception("Error handling message on routing key %s", routing_key)
    else:
        logger.warning("No handler for routing key: %s", routing_key)

    channel.basic_ack(delivery_tag=method.delivery_tag)


def start_consumer() -> None:
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST, port=RABBITMQ_PORT)
    )
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

    result = channel.queue_declare(queue="notifications_queue", durable=True, exclusive=False)
    queue_name = result.method.queue

    for key in ROUTING_KEYS:
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=queue_name, routing_key=key)

    channel.basic_consume(queue=queue_name, on_message_callback=_on_message)
    logger.info("Notification consumer started. Listening on exchange '%s'", EXCHANGE_NAME)
    channel.start_consuming()


def start_consumer_thread() -> threading.Thread:
    thread = threading.Thread(target=start_consumer, daemon=True, name="rabbitmq-consumer")
    thread.start()
    return thread
