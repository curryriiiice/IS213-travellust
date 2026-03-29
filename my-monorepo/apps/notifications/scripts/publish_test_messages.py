"""
Manual test script — publish sample messages to the travellust_notifications exchange.

Prerequisites:
  - RabbitMQ is running (docker compose up -d rabbitmq)
  - pika is installed (uv run python scripts/publish_test_messages.py)

Usage:
  uv run python scripts/publish_test_messages.py
  uv run python scripts/publish_test_messages.py --routing-key booking.success
"""

import argparse
import json
import sys

import pika

EXCHANGE = "travellust_notifications"

SAMPLE_MESSAGES = {
    "booking.success": {
        "user_id": "user-001",
        "booking_id": "booking-abc123",
    },
    "booking.failure": {
        "user_id": "user-002",
        "reason": "Hotel fully booked for selected dates",
    },
    "payment.success": {
        "user_id": "user-003",
        "amount": "249.99",
    },
    "payment.failure": {
        "user_id": "user-004",
        "reason": "Card declined",
    },
}


def publish(host: str, port: int, routing_key: str | None) -> None:
    print(f"Connecting to RabbitMQ at {host}:{port} ...")
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=host, port=port)
    )
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE,
        exchange_type="topic",
        durable=True,
    )

    keys_to_send = [routing_key] if routing_key else list(SAMPLE_MESSAGES.keys())

    for key in keys_to_send:
        if key not in SAMPLE_MESSAGES:
            print(f"  [!] Unknown routing key: {key}")
            continue

        body = json.dumps(SAMPLE_MESSAGES[key])
        channel.basic_publish(
            exchange=EXCHANGE,
            routing_key=key,
            body=body,
            properties=pika.BasicProperties(content_type="application/json"),
        )
        print(f"  [x] Sent '{key}' -> {body}")

    connection.close()
    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publish test messages to RabbitMQ.")
    parser.add_argument("--host", default="localhost", help="RabbitMQ host (default: localhost)")
    parser.add_argument("--port", type=int, default=5672, help="RabbitMQ port (default: 5672)")
    parser.add_argument(
        "--routing-key",
        choices=list(SAMPLE_MESSAGES.keys()),
        help="Send only this routing key (default: send all)",
    )
    args = parser.parse_args()

    try:
        publish(args.host, args.port, args.routing_key)
    except pika.exceptions.AMQPConnectionError as e:
        print(f"\n[ERROR] Could not connect to RabbitMQ: {e}")
        print("Make sure RabbitMQ is running: docker compose up -d rabbitmq")
        sys.exit(1)
