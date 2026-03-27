# booked_tickets

Microservice for managing booked tickets. Runs on port **5006**.

## Running the service

```bash
docker-compose up booked_tickets
```

## API Endpoints

### Health Check

**GET** `/health`

Response `200`:
```json
{ "service": "booked_tickets", "status": "ok" }
```

---

### List all booked tickets

**GET** `/api/booked_tickets`

Response `200`:
```json
{
  "count": 2,
  "data": [...]
}
```

---

### List booked tickets by user

**GET** `/api/users/<user_id>/booked_tickets`

Response `200`:
```json
{
  "count": 1,
  "data": [...]
}
```

---

### Get a booked ticket

**GET** `/api/booked_tickets/<booked_ticket_id>`

Response `200`:
```json
{
  "data": {
    "booked_ticket_id": 1,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "f_h_a_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "cost": "99.99",
    "paid_by": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "cancelled": false
  }
}
```

Response `404`:
```json
{ "error": "Booked ticket not found" }
```

---

### Create a booked ticket

**POST** `/api/booked_tickets`

Request body:
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "f_h_a_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "cost": 99.99,
  "paid_by": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | UUID | Yes | UUID of the user who booked the ticket |
| `f_h_a_id` | UUID | Yes | UUID of the flight/hotel/activity |
| `cost` | number | No | Total cost of the booking |
| `paid_by` | UUID | No | UUID of the user who paid for the tickets |

Response `201`:
```json
{
  "data": {
    "booked_ticket_id": 1,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "f_h_a_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "cost": "99.99",
    "paid_by": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "cancelled": false
  }
}
```

Response `400`:
```json
{ "error": "Missing required fields: f_h_a_id, user_id." }
```

---

### Update a booked ticket

**PUT** `/api/booked_tickets/<booked_ticket_id>`

Request body (at least one field required):
```json
{
  "cost": 149.99,
  "paid_by": "PayNow",
  "cancelled": true
}
```

| Field | Type | Description |
|---|---|---|
| `cost` | number | Updated cost of the booking |
| `paid_by` | UUID | UUID of the user who paid for the tickets |
| `cancelled` | boolean | Whether the booking is cancelled |

Response `200`:
```json
{
  "data": {
    "booked_ticket_id": 1,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "f_h_a_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "cost": "149.99",
    "paid_by": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "cancelled": true
  }
}
```

Response `404`:
```json
{ "error": "Booked ticket not found" }
```

---

### Delete a booked ticket

**DELETE** `/api/booked_tickets/<booked_ticket_id>`

Response `200`:
```json
{
  "message": "Booked ticket deleted",
  "data": { ... }
}
```

Response `404`:
```json
{ "error": "Booked ticket not found" }
```
