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
    "user_id": 1,
    "f_h_a_id": 2,
    "cost": "99.99",
    "paid_by": "credit card",
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
  "user_id": 1,
  "f_h_a_id": 2,
  "cost": 99.99,
  "paid_by": 1
}
```

| Field | Type | Required |
|---|---|---|
| `user_id` | integer | Yes |
| `f_h_a_id` | integer | Yes |
| `cost` | number | No |
| `paid_by` | integer | Yes |

Response `201`:
```json
{
  "data": {
    "booked_ticket_id": 1,
    "user_id": 1,
    "f_h_a_id": 2,
    "cost": "99.99",
    "paid_by": 1,
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

| Field | Type |
|---|---|
| `cost` | number |
| `paid_by` | string |
| `cancelled` | boolean |

Response `200`:
```json
{
  "data": {
    "booked_ticket_id": 1,
    "user_id": 1,
    "f_h_a_id": 2,
    "cost": "149.99",
    "paid_by": "PayNow",
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
