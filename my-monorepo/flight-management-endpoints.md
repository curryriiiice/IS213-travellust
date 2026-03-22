# Flight Management Composite Service Endpoints

Base URL: `http://localhost:5005`

## 1. POST /api/flights/search
Search for available flights based on origin, destination, and travel dates.

**Type:** POST

**Input Example:**
```json
{
    "origin": "SIN",
    "destination": "HKG",
    "datetime_departure": "2026-04-01T10:00:00Z",
    "datetime_arrival": "2026-04-08T10:00:00Z"
}
```

**Returns:** Flight search results from flight-search-wrapper
```json
{
    "count": 2,
    "data": [
        {
            "airline": "AirAsia",
            "currency": "USD",
            "datetime_arrival": "2026-04-08T23:25:00",
            "datetime_departure": "2026-04-01T17:55:00",
            "external_link": "https://www.google.com/travel/flights?q=Flights%20from%20SIN%20to%20NRT%20on%202026-04-01%20through%202026-04-08",
            "flight_number": "1796",
            "price_sgd": 778.34,
            "price_usd": 580.85
        }
    ],
    "success": true
}
```

---

## 2. POST /api/flights/save
Save a selected flight to a specific trip.

**Type:** POST

**Input Example:**
```json
{
    "flight_details": {
        "airline": "AirAsia",
        "currency": "USD",
        "datetime_arrival": "2026-04-08T23:25:00",
        "datetime_departure": "2026-04-01T17:55:00",
        "external_link": "https://www.google.com/travel/flights?q=Flights%20from%20SIN%20to%20NRT%20on%202026-04-01%20through%202026-04-08",
        "flight_number": "1796",
        "price_sgd": 778.34,
        "price_usd": 580.85
    },
    "trip_id": "trip-123",
    "cost": 778.34
}
```

**Returns:** Confirmation of saved flight with generated flight_id
```json
{
    "success": true,
    "data": {
        "flight_id": "supabase-generated-uuid"
    }
}
```

---

## 3. POST /api/flights/book (Not done with this! Need to implement a fake booking process that returns a success message)
Book a flight for a trip (simulated booking response).

**Type:** POST

**Input Example:**
```json
{
    "flight_id": "supabase-generated-uuid"
}
```

**Returns:** Booking confirmation
```json
{
    "success": true,
    "data": {
        "flight_id": "supabase-generated-uuid"
    }
}
```

---

## 4. GET /api/flights/<flight_id>
Retrieve details of a saved flight by its ID.

**Type:** GET

**Input:** No JSON body required (flight_id in URL path)

**Returns:** Complete flight details
```json
{
    "success": true,
    "data": {
        "flight_id": "supabase-uuid",
        "flight_number": "1796",
        "airline": "AirAsia",
        "datetime_departure": "2026-04-01T17:55:00",
        "datetime_arrival": "2026-04-08T23:25:00",
        "external_link": "https://...",
        "trip_id": "trip-123",
        "cost": 778.34,
        "created_at": "2026-03-22T10:00:00Z"
    }
}
```

---

## Service Architecture
- **flight-search-wrapper**: Port 5003
- **saved-flights**: Port 5004
- **flight-management**: Port 5005 (composite service)