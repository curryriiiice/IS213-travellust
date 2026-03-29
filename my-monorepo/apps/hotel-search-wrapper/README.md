# Hotel Search Wrapper Service

## Overview
The Hotel Search Wrapper is an atomic microservice that integrates with SerpApi's Google Hotels search functionality. It provides hotel search capabilities for the hotel management system.

## Architecture
- **Language**: Python 3.12+
- **Framework**: Flask
- **Package Manager**: uv
- **Port**: 5000

## Features
- Hotel search using SerpApi Google Hotels
- Support for custom queries
- Location-based suggestions
- Price filtering and sorting
- Rating filters

## Environment Variables
```bash
SERPAPI_KEY=your_serpapi_key
```

## API Endpoints

### POST `/api/search`
Search for hotels with specified parameters.

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
    "properties": [...],
    "search_metadata": {...}
  }
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Hello hotel-search-wrapper - Service is running"
}
```

## Local Development

### Prerequisites
- Python 3.12+
- uv package manager

### Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Install dependencies
uv sync

# Run the service
python -u src/hotel_search_wrapper_app.py
```

### Using Docker
```bash
# Build the image
docker build -t hotel-search-wrapper .

# Run the container
docker run -p 5001:5000 --env-file .env hotel-search-wrapper
```

## Docker Compose
```bash
# Run all hotel management services together
docker-compose up --build
```

## Testing
```bash
# Run health check
curl http://localhost:5001/health

# Test search endpoint
curl -X POST http://localhost:5001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Singapore",
    "check_in_date": "2026-04-01",
    "check_out_date": "2026-04-02",
    "currency": "SGD"
  }'
```

## Dependencies
- google-search-results>=2.4.2
- python-dotenv>=1.0.0
- flask>=3.1.3

## License
MIT
