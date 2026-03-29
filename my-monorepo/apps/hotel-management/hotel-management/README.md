# Hotel Management Composite Service

## Overview
The Hotel Management service is a composite microservice that orchestrates between the Hotel Search Wrapper and Saved Hotels services. It acts as the main entry point for hotel management operations.

## Architecture
- **Language**: Python 3.12+
- **Framework**: Flask
- **Pattern**: Composite/Orchestrator
- **Package Manager**: uv
- **Port**: 5000
- **Communication**: HTTP requests to atomic services

## Features
- Orchestrates hotel search via search wrapper
- Manages hotel save operations via saved hotels service
- Fetches latest hotel prices and updates database
- Provides unified API for frontend clients
- Clear separation of search and save concerns

## Architecture Diagram
```
Frontend → Hotel Management Composite → Hotel Search Wrapper
                                          → Saved Hotels
```

## Environment Variables
```bash
SEARCH_SERVICE_URL=http://hotel-search-wrapper:5000
SAVED_HOTELS_SERVICE_URL=http://saved-hotels:5000
```

## API Endpoints

### POST `/api/search`
Search for hotels without saving to database.

**Request Body:**
```json
{
  "city": "Singapore",
  "query": "hotels near Singapore",
  "check_in_date": "2026-04-01",
  "check_out_date": "2026-04-02",
  "adults": 2,
  "children": 0,
  "currency": "SGD",
  "hl": "en",
  "sort_by": 3,
  "rating": 8
}
```

**Response:**
```json
{
  "data": {
    "search_results": {...},
    "status": "success"
  }
}
```

### POST `/api/save-hotel`
Save a selected hotel to the database.

**Request Body:**
```json
{
  "uid": "user_12345",
  "trip_id": "uuid-here",
  "hotel": {
    "name": "Marina Bay Sands",
    "description": "Luxury hotel...",
    "check_in_date": "2026-04-01",
    "check_out_date": "2026-04-02",
    "external_link": "https://...",
    "link": "property_token",
    "overall_rating": 4.5,
    "rate_per_night": 250.00,
    "lat": 1.2836,
    "long": 103.8607,
    "amenities": ["Free WiFi", "Pool"],
    "photos": ["url1.jpg", "url2.jpg", "url3.jpg"]
  }
}
```

**Response:**
```json
{
  "data": {
    "saved_hotel": {
      "hotel_id": "uuid...",
      "name": "Marina Bay Sands",
      "photos": ["url1.jpg", "url2.jpg"],
      // ... all hotel fields
    },
    "uid": "user_12345",
    "trip_id": "uuid-here",
    "status": "success"
  }
}
```

### GET `/api/hotels/<hotel_id>`
Get hotel details by database ID.

**URL Parameter:**
- `hotel_id`: Hotel UUID

**Response:**
```json
{
  "data": {
    "hotel": {
      "hotel_id": "uuid...",
      "name": "Marina Bay Sands",
      // ... all hotel fields
    },
    "status": "success"
  }
}
```

### POST `/api/hotels/<hotel_id>/fetch-latest-price`
Fetch latest price for a saved hotel and update it in the database.

**URL Parameter:**
- `hotel_id`: Hotel UUID

**Response:**
```json
{
  "data": {
    "hotel": {
      "hotel_id": "uuid...",
      "rate_per_night": 480.00,
      // ... other hotel fields
    },
    "old_price": 450.00,
    "new_price": 480.00,
    "status": "success",
    "message": "Hotel price updated successfully"
  }
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Hello hotel-management - Composite orchestrator service is running"
}
```

## Local Development

### Prerequisites
- Python 3.12+
- uv package manager
- Hotel Search Wrapper service running
- Saved Hotels service running

### Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with service URLs (if needed)
nano .env

# Install dependencies
uv sync

# Run the service
python -u src/hotel_management_app.py
```

### Using Docker
```bash
# Build the image
docker build -t hotel-management .

# Run the container
docker run -p 5000:5000 --env-file .env hotel-management
```

## Docker Compose
```bash
# Run all hotel management services together
docker-compose up --build
```

The Docker Compose setup will:
1. Build all three services
2. Create a bridge network for inter-service communication
3. Configure environment variables for service URLs
4. Expose ports: 5000 (management), 5001 (search), 5002 (saved-hotels)

## Testing
```bash
# Run health check
curl http://localhost:5000/health

# Test search endpoint
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Singapore",
    "check_in_date": "2026-04-01",
    "check_out_date": "2026-04-02",
    "currency": "SGD"
  }'

# Test save endpoint
curl -X POST http://localhost:5000/api/save-hotel \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "user_12345",
    "trip_id": "test-trip-id",
    "hotel": {
      "name": "Test Hotel",
      "check_in_date": "2026-04-01",
      "check_out_date": "2026-04-02"
    }
  }'

# Test get hotel details
curl http://localhost:5000/api/hotels/<hotel_id>

# Test fetch latest price
curl -X POST http://localhost:5000/api/hotels/<hotel_id>/fetch-latest-price
```

## Dependencies
- flask>=3.1.3
- python-dotenv>=1.0.0
- requests>=2.31.0

## License
MIT
