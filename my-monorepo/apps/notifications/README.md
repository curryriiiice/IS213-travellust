# notifications

Microservice for handling notifications. Runs on port **5014**.

Listens to a RabbitMQ topic exchange and logs a notification whenever a booking or payment event is published by another microservice.

---

## How it works

```
Other microservice
      │
      │  publishes message to RabbitMQ exchange
      ▼
┌─────────────────────────────────┐
│  Exchange: travellust_notifications  │
│  Type: topic                    │
└─────────────────────────────────┘
      │
      │  routed by routing key
      ▼
┌─────────────────────────────────┐
│  Notifications service consumer │
│  (background thread)            │
└─────────────────────────────────┘
      │
      │  calls the matching handler
      ▼
  Log notification
```

The Flask app starts on boot and spawns a **background thread** that connects to RabbitMQ and continuously listens for messages. When a message arrives, it is routed to the correct handler based on its routing key.

---

## Supported events

| Routing Key        | Trigger                        |
|--------------------|--------------------------------|
| `booking.success`  | A booking was created successfully |
| `booking.failure`  | A booking attempt failed       |
| `payment.success`  | A payment was processed successfully |
| `payment.failure`  | A payment attempt failed       |

---

## Running the service

```bash
docker-compose up --build notifications
```

RabbitMQ must be running first. It starts automatically via `depends_on` in docker-compose.

**RabbitMQ management UI:** `http://localhost:15672`
Login: `guest` / `guest`

---

## Health check

**GET** `/health`

Response `200`:
```json
{ "service": "notifications", "status": "ok" }
```

---

## How to publish a notification from another microservice

Install `pika` in your microservice:
```bash
uv add pika
```

Then publish a message to the exchange:

```python
import pika
import json

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="rabbitmq")
)
channel = connection.channel()

channel.exchange_declare(
    exchange="travellust_notifications",
    exchange_type="topic",
    durable=True
)

channel.basic_publish(
    exchange="travellust_notifications",
    routing_key="booking.success",  # change to the relevant event
    body=json.dumps({
        "user_id": 1,
        "booking_id": 42
    })
)

connection.close()
```

---

## Message payloads

### `booking.success`
```json
{
  "user_id": 1,
  "booking_id": 42
}
```

### `booking.failure`
```json
{
  "user_id": 1,
  "reason": "No seats available"
}
```

### `payment.success`
```json
{
  "user_id": 1,
  "amount": 99.99
}
```

### `payment.failure`
```json
{
  "user_id": 1,
  "reason": "Insufficient funds"
}
```

---

## Environment variables

| Variable          | Default     | Description              |
|-------------------|-------------|--------------------------|
| `RABBITMQ_HOST`   | `rabbitmq`  | RabbitMQ hostname        |
| `RABBITMQ_PORT`   | `5672`      | RabbitMQ AMQP port       |
