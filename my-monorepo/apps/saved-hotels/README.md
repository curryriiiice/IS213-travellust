# Saved Hotels Service

## Overview
The Saved Hotels service is an atomic microservice that manages hotel storage in Supabase. It provides CRUD operations for hotel data within the hotel management system.

## Architecture
- **Language**: Python 3.12+
- **Framework**: Flask
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: uv
- **Port**: 5000

## Features
- Create hotels with full details
- Retrieve hotels by ID
- Update hotel information
- Delete hotels
- Query hotels by trip ID
- Photo management (max 3 per hotel)
- User and trip tracking

## Environment Variables
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

## Database Schema
```sql
CREATE TABLE hotel (
    hotel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    datetime_check_in TIMESTAMPTZ NOT NULL,
    datetime_check_out TIMESTAMPTZ NOT NULL,
    external_link VARCHAR(255),
    link VARCHAR(255),
    trip_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    overall_rating DECIMAL(3,2) CHECK (overall_rating >= 0 AND overall_rating <= 5),
    rate_per_night DECIMAL(10,2),
    lat DECIMAL(10,8),
    long DECIMAL(11,8),
    amenities TEXT[],
    photos TEXT[]
);
```

## API Endpoints

### POST `/api/save-hotel`
Save a hotel to the database.

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
Get a specific hotel by ID.

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

### GET `/api/hotels/trip/<trip_id>`
Get all hotels for a specific trip.

**Response:**
```json
{
  "data": {
    "hotels": [...],
    "status": "success"
  }
}
```

### PATCH `/api/hotels/<hotel_id>`
Update hotel details.

**Request Body:**
```json
{
  "rate_per_night": 300.00,
  "photos": ["new_url1.jpg", "new_url2.jpg"]
}
```

### DELETE `/api/hotels/<hotel_id>`
Delete a hotel from the database.

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Hello saved-hotels - Service is running"
}
```

## Local Development

### Prerequisites
- Python 3.12+
- uv package manager
- Supabase project with database access

### Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env

# Install dependencies
uv sync

# Run the service
python -u src/saved_hotels_app.py
```

### Using Docker
```bash
# Build the image
docker build -t saved-hotels .

# Run the container
docker run -p 5002:5000 --env-file .env saved-hotels
```

## Docker Compose
```bash
# Run all hotel management services together
docker-compose up --build
```

## Testing
```bash
# Run health check
curl http://localhost:5002/health

# Test save endpoint
curl -X POST http://localhost:5002/api/save-hotel \
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
```

## Dependencies
- supabase>=2.0.0
- python-dotenv>=1.0.0
- flask>=3.1.3

## License
MIT
