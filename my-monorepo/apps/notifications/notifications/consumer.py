from __future__ import annotations

import json
import logging
import os
import threading

import pika

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


def _handle_booking_success(data: dict) -> None:
    logger.info(
        "[NOTIFICATION] Booking successful | user_id=%s booking_id=%s",
        data.get("user_id"),
        data.get("booking_id"),
    )


def _handle_booking_failure(data: dict) -> None:
    logger.warning(
        "[NOTIFICATION] Booking failed | user_id=%s reason=%s",
        data.get("user_id"),
        data.get("reason"),
    )


def _handle_payment_success(data: dict) -> None:
    logger.info(
        "[NOTIFICATION] Payment successful | user_id=%s amount=%s",
        data.get("user_id"),
        data.get("amount"),
    )


def _handle_payment_failure(data: dict) -> None:
    logger.warning(
        "[NOTIFICATION] Payment failed | user_id=%s reason=%s",
        data.get("user_id"),
        data.get("reason"),
    )


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

    result = channel.queue_declare(queue="", exclusive=True)
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
