from __future__ import annotations

import json
import logging
import os

try:
    import pika
except ImportError:  # pragma: no cover
    pika = None

logger = logging.getLogger(__name__)


def publish_booking_event(routing_key: str, payload: dict) -> bool:
    exchange_name = os.getenv("RABBITMQ_EXCHANGE", "travellust_notifications")
    rabbitmq_host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    rabbitmq_port = int(os.getenv("RABBITMQ_PORT", "5672"))

    if pika is None:
        logger.warning("pika is not installed. Booking event was not published.")
        return False

    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host, port=rabbitmq_port)
        )
        channel = connection.channel()
        channel.exchange_declare(
            exchange=exchange_name,
            exchange_type="topic",
            durable=True,
        )
        channel.basic_publish(
            exchange=exchange_name,
            routing_key=routing_key,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )
        connection.close()
        return True
    except Exception:
        logger.exception(
            "Failed to publish booking event to RabbitMQ with routing key %s",
            routing_key,
        )
        return False
