# Trips Service Endpoints

**Base URL:** `http://localhost:5000`

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

**Response:**
```json
{
  "status": "ok",
  "message": "trips_atomic service is running"
}
```

---

## Trips

### Get Trips by User

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips/user/<user_id>` | Get all trips where user_id is in member_ids |

**Response (200 OK):**
```json
{
  "data": [...],
  "count": 5
}
```

---

## Generic CRUD Operations

### Get All Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/<table>` | Get all records from a table |

**Example:** `GET /api/trips`

**Response (200 OK):**
```json
{
  "data": [...],
  "count": 10
}
```

---

### Get Record by ID

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/<table>/<id>` | Get a single record by ID |

**Example:** `GET /api/trips/550e8400-e29b-41d4-a716-446655440000`

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Singapore Trip",
    ...
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Record not found"
}
```

---

### Create Record

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/<table>` | Create a new record |

**Example:** `POST /api/trips`

**Request Body:**
```json
{
  "name": "Singapore Trip",
  "member_ids": ["user-1", "user-2"],
  "flight_ids": [],
  "hotel_ids": [],
  "attraction_ids": [],
  "start_date": "2026-04-15",
  "end_date": "2026-04-20"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Singapore Trip",
    ...
  }
}
```

---

### Update Record

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/<table>/<id>` | Update an existing record |

**Example:** `PUT /api/trips/550e8400-e29b-41d4-a716-446655440000`

**Request Body:**
```json
{
  "name": "Updated Singapore Trip",
  "flight_ids": ["flight-1", "flight-2"]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Singapore Trip",
    ...
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Record not found"
}
```

---

### Delete Record

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/api/<table>/<id>` | Delete a record |

**Example:** `DELETE /api/trips/550e8400-e29b-41d4-a716-446655440000`

**Response (200 OK):**
```json
{
  "message": "Record deleted",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Record not found"
}
```

---

## Trip Table Schema

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Trip name |
| member_ids | array | List of user IDs who are members |
| flight_ids | array | List of flight IDs |
| hotel_ids | array | List of hotel IDs |
| attraction_ids | array | List of attraction IDs |
| start_date | date | Trip start date |
| end_date | date | Trip end date |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |
