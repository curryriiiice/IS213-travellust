# Microservices API Endpoints Documentation

This document provides an overview of all available endpoints for each microservice in the TravelLust system.

## Service Ports (from docker-compose.yml)

- **trips_atomic**: 5001
- **hotel-search-wrapper**: 5007
- **saved-hotels**: 5008
- **hotel-management**: 5009
- **book-hotels**: 5012

---

## 1. trips_atomic Service
**Base URL**: `http://localhost:5001`

Generic CRUD service for Supabase tables with dynamic table routing.

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint (if configured)

### Generic Table Operations

#### Get All Records
- **GET** `/api/<table>`
- **Description**: Retrieve all records from a specified table
- **Response**: `{"data": [...], "count": N}`

#### Get Record by ID
- **GET** `/api/<table>/<id>`
- **Description**: Retrieve a single record by ID
- **Response**: `{"data": {...}}`
- **Error**: 404 if record not found

#### Create Record
- **POST** `/api/<table>`
- **Description**: Create a new record in the specified table
- **Body**: JSON object with record data
- **Response**: `{"data": {...}}` with status 201
- **Error**: 400 if request body is empty

#### Update Record
- **PUT** `/api/<table>/<id>`
- **Description**: Update an existing record
- **Body**: JSON object with fields to update
- **Response**: `{"data": {...}}`
- **Error**: 404 if record not found, 400 if request body is empty

#### Delete Record
- **DELETE** `/api/<table>/<id>`
- **Description**: Delete a record by ID
- **Response**: `{"message": "Record deleted", "data": {...}}`
- **Error**: 404 if record not found

---

## 2. hotel-search-wrapper Service
**Base URL**: `http://localhost:5007`

Service for searching hotels using SerpApi.

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint
- **Response**: `{"status": "ok", "message": "..."}`

### Search Hotels
- **POST** `/api/search`
- **Description**: Search for hotels without saving to database
- **Body**:
  ```json
  {
    "query": "hotels near Singapore",
    "city": "Singapore",
    "check_in_date": "2025-01-15",
    "check_out_date": "2025-01-17",
    "adults": 2,
    "children": 0,
    "currency": "SGD",
    "hl": "en",
    "sort_by": 3,
    "rating": 8
  }
  ```
- **Parameters**:
  - `query` OR `city`: Search query (required if city not provided)
  - `check_in_date`: Check-in date in YYYY-MM-DD format (required)
  - `check_out_date`: Check-out date in YYYY-MM-DD format (required)
  - `adults`: Number of adults (default: 2)
  - `children`: Number of children (default: 0)
  - `currency`: Currency code (default: "SGD")
  - `hl`: Language code (default: "en")
  - `sort_by`: Sort option (optional)
    - 3: Lowest price
    - 8: Highest rating
    - 13: Most reviewed
  - `rating`: Rating filter (optional)
    - 7: 3.5+
    - 8: 4.0+
    - 9: 4.5+
- **Response**: `{"data": {...}}`

---

## 3. saved-hotels Service
**Base URL**: `http://localhost:5008`

Service for managing saved hotel records in the database.

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint
- **Response**: `{"status": "ok", "message": "..."}`

### Get All Hotels
- **GET** `/api/hotels`
- **Description**: Retrieve all saved hotels
- **Response**: `{"data": [...], "count": N}`

### Get Hotel by ID
- **GET** `/api/hotels/<hotel_id>`
- **Description**: Retrieve a single hotel by ID
- **Response**: `{"data": {...}}`
- **Error**: 404 if hotel not found

### Get Hotels by Trip ID
- **GET** `/api/hotels/trip/<trip_id>`
- **Description**: Retrieve all hotels for a specific trip
- **Response**: `{"data": [...], "count": N}`

### Save Hotel
- **POST** `/api/hotels`
- **Description**: Save a new hotel to the database
- **Body**:
  ```json
  {
    "hotel": {
      "name": "Hotel Name",
      "datetime_check_in": "2025-01-15T00:00:00",
      "datetime_check_out": "2025-01-17T00:00:00",
      "trip_id": "uuid",
      "description": "Hotel description",
      "external_link": "https://example.com",
      "link": "property_token",
      "overall_rating": 4.5,
      "rate_per_night": 200.00,
      "lat": 1.3521,
      "long": 103.8198,
      "amenities": ["WiFi", "Pool", "Gym"],
      "photos": ["https://example.com/photo1.jpg"]
    }
  }
  ```
- **Response**: `{"data": {...}}` with status 201
- **Note**: Supports both nested `hotel` object and direct format

### Update Hotel
- **PUT** `/api/hotels/<hotel_id>`
- **Description**: Update an existing hotel
- **Body**: JSON object with fields to update
- **Response**: `{"data": {...}}`
- **Error**: 404 if hotel not found

### Soft Delete Hotels
- **POST** `/api/hotels/soft-delete`
- **Description**: Soft delete multiple hotels by setting the `deleted` attribute to true
- **Body**:
  ```json
  {
    "hotel_ids": ["hotel_uuid_1", "hotel_uuid_2"]
  }
  ```
- **Response**:
  ```json
  {
    "message": "Hotels soft deleted successfully",
    "deleted_count": 2,
    "deleted_hotel_ids": ["hotel_uuid_1", "hotel_uuid_2"]
  }
  ```
- **Error**: 400 if `hotel_ids` is missing or not an array
- **Note**: Hotels remain in database but are marked as deleted

---

## 4. hotel-management Service
**Base URL**: `http://localhost:5009`

Composite orchestrator service for hotel search and management operations.

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint
- **Response**: `{"status": "ok", "message": "..."}`

### Search Hotels (Wrapper)
- **POST** `/api/search`
- **Description**: Search for hotels without saving to database (proxies to hotel-search-wrapper)
- **Body**: Same as hotel-search-wrapper `/api/search`
- **Response**: `{"data": {...}}`

### Save Hotel to Database
- **POST** `/api/save-hotel`
- **Description**: Save a selected hotel to the database and update trip's hotel_ids array
- **Body**:
  ```json
  {
    "uid": "user_uuid",
    "trip_id": "trip_uuid",
    "hotel": {
      "name": "Hotel Name",
      "check_in_date": "2025-01-15",
      "check_out_date": "2025-01-17",
      "description": "Hotel description",
      "external_link": "https://example.com",
      "link": "property_token",
      "overall_rating": 4.5,
      "rate_per_night": 200.00,
      "lat": 1.3521,
      "long": 103.8198,
      "amenities": ["WiFi", "Pool"],
      "photos": ["https://example.com/photo.jpg"]
    }
  }
  ```
- **Required Fields**: `uid`, `trip_id`, `hotel`
- **Response**: `{"data": {...}}`
- **Note**: Automatically updates the trip's `hotel_ids` array in trips_atomic

### Get Hotel Details
- **GET** `/api/hotels/<hotel_id>`
- **Description**: Retrieve hotel details by hotel ID
- **Response**: `{"data": {"hotel": {...}}}`
- **Error**: 404 if hotel not found

### Fetch Latest Price
- **POST** `/api/hotels/<hotel_id>/fetch-latest-price`
- **Description**: Fetch the latest price for a hotel and update it in the database
- **Response**: `{"data": {...}}`
- **Process**:
  1. Retrieves hotel details from saved-hotels
  2. Searches for latest price using hotel-search-wrapper
  3. Updates hotel's rate_per_night in database
  4. Returns old and new price

### Soft Delete Hotels from Trip
- **POST** `/api/hotel/delete`
- **Description**: Soft delete multiple hotels from a specific trip
- **Body**:
  ```json
  {
    "trip_id": "trip_uuid",
    "hotel_ids": ["hotel_uuid_1", "hotel_uuid_2"]
  }
  ```
- **Required Fields**: `trip_id`, `hotel_ids` (array of hotel UUIDs)
- **Response**:
  ```json
  {
    "data": {
      "updated_trip": {
        "trip_id": "trip_uuid",
        "hotel_ids": ["hotel_uuid_3", "hotel_uuid_4"],
        ...
      },
      "soft_deleted_hotels": ["hotel_uuid_1", "hotel_uuid_2"],
      "deleted_count": 2,
      "status": "success",
      "message": "Hotels soft deleted successfully from trip"
    }
  }
  ```
- **Error**: 400 if `trip_id` or `hotel_ids` is missing, or if `hotel_ids` is not an array, 404 if trip not found
- **Process**:
  1. Retrieves current trip data from trips_atomic
  2. Updates trip's `hotel_ids` array to remove specified hotel_ids
  3. Updates `deleted` attribute to true in saved-hotels service
  4. Returns updated trip and list of soft deleted hotel IDs
- **Note**: Hotels remain in database but are marked as deleted and removed from trip's hotel_ids array

---

## 5. book-hotels Service
**Base URL**: `http://localhost:5012`

Composite orchestrator service for hotel booking operations.

### Health Check
- **GET** `/health`
- **Description**: Health check endpoint
- **Response**: `{"status": "ok", "message": "..."}`

### Book Hotel
- **POST** `/api/book-hotel`
- **Description**: Book a hotel for a trip
- **Body**:
  ```json
  {
    "trip_id": "trip_uuid",
    "user_id": "user_uuid",
    "ticket_holder_userids": ["user1_uuid", "user2_uuid"],
    "hotel_id": "hotel_uuid"
  }
  ```
- **Required Fields**: `trip_id`, `user_id`, `hotel_id`
- **Response**:
  ```json
  {
    "data": {
      "success": true,
      "hotel": {...},
      "booked_ticket": {...},
      "message": "Booking successful! Your hotel has been booked.",
      "status": "success"
    }
  }
  ```
- **Process**:
  1. Verifies hotel ownership (checks if hotel_id is in trip's hotel_ids)
  2. Gets hotel details with latest price from hotel-management
  3. Simulates booking (1 in 50 chance of failure)
  4. Sends booking activity/error to AMQP broker
  5. Creates booked_ticket entry in booked_tickets service
  6. Returns booking confirmation
- **Note**: Booking has a 2% failure rate (simulated for testing)

### Verify Hotel Ownership
- **POST** `/api/verify-hotel-ownership`
- **Description**: Verify if a hotel belongs to a trip
- **Body**:
  ```json
  {
    "trip_id": "trip_uuid",
    "hotel_id": "hotel_uuid"
  }
  ```
- **Response**:
  ```json
  {
    "data": {
      "is_owner": true,
      "trip": {...},
      "status": "success"
    }
  }
  ```

### Get Hotel Details with Latest Price
- **GET** `/api/hotels/<hotel_id>/details`
- **Description**: Get hotel details with the latest price fetched
- **Response**:
  ```json
  {
    "data": {
      "hotel": {...},
      "latest_price": 250.00,
      "status": "success"
    }
  }
  ```
- **Process**:
  1. Gets hotel details from hotel-management
  2. Fetches latest price using hotel-management's fetch-latest-price endpoint
  3. Returns hotel with latest price

---

## Service Dependencies

### hotel-management depends on:
- **hotel-search-wrapper**: For hotel search functionality
- **saved-hotels**: For hotel persistence
- **trips_atomic**: For updating trip's hotel_ids array

### book-hotels depends on:
- **trips_atomic**: For verifying hotel ownership
- **hotel-management**: For getting hotel details and latest price
- **booked_tickets**: For creating booked_ticket entries
- **AMQP Broker**: For publishing booking activities and errors

---

## Common Error Responses

All services return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- **200**: Success
- **201**: Created
- **400**: Bad Request (invalid or missing parameters)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

---

## Environment Variables

Required environment variables (from .env file):

### hotel-management
- `SUPABASE_URL`: Supabase database URL
- `SUPABASE_KEY`: Supabase API key
- `SEARCH_SERVICE_URL`: hotel-search-wrapper URL
- `SAVED_HOTELS_SERVICE_URL`: saved-hotels URL
- `TRIPS_SERVICE_URL`: trips_atomic URL

### book-hotels
- `TRIPS_ATOMIC_URL`: trips_atomic service URL
- `HOTEL_MANAGEMENT_URL`: hotel-management service URL
- `BOOKED_TICKETS_URL`: booked_tickets service URL
- `AMQP_URL`: AMQP broker URL
- `AMQP_EXCHANGE`: AMQP exchange name
- `AMQP_ROUTING_KEY_ACTIVITY`: Routing key for booking activities
- `AMQP_ROUTING_KEY_ERROR`: Routing key for booking errors
