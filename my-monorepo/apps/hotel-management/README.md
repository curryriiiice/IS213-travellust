# Hotel Management Microservices

## Overview
A microservices-based hotel management system with clear separation of concerns. The system consists of three independently deployable services that work together via HTTP communication.

## Architecture

### Service Composition
```
┌──────────────────────────────────────────────────┐
│         Hotel Management Composite            │
│        (Orchestrator Service)               │
└───────────────┬────────────────────────────────┘
                │
        ┌───────┴──────────────┐
        │                      │
┌───────▼────────┐  ┌──────▼──────────┐
│  Hotel Search     │  │   Saved Hotels    │
│   Wrapper         │  │   Service        │
│  (Atomic)        │  │   (Atomic)       │
└─────────────────┘  └──────────────────┘
```

### Services

#### 1. Hotel Search Wrapper (Atomic)
- **Purpose**: Search hotels using SerpApi Google Hotels
- **Port**: 5001
- **Key Features**:
  - Google Hotels search integration
  - Location-based suggestions
  - Price and rating filtering
  - Custom query support

#### 2. Saved Hotels (Atomic)
- **Purpose**: Store and manage hotel data in Supabase
- **Port**: 5002
- **Key Features**:
  - CRUD operations for hotels
  - User and trip tracking
  - Photo management (max 3 per hotel)
  - Supabase database integration

#### 3. Hotel Management (Composite)
- **Purpose**: Orchestrate between search and saved hotels services
- **Port**: 5000
- **Key Features**:
  - Unified API for frontend
  - HTTP-based service communication
  - Price update functionality
  - Separation of search and save concerns

## Project Structure
```
apps/hotel-management/
├── hotel-search-wrapper/          # Atomic service
│   ├── src/
│   │   ├── hotel_search_wrapper.py
│   │   └── hotel_search_wrapper_app.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── saved-hotels/                 # Atomic service
│   ├── src/
│   │   ├── saved_hotels.py
│   │   ├── saved_hotels_app.py
│   │   └── supabase_client.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── hotel-management/              # Composite service
│   ├── src/
│   │   ├── hotel_management_service.py
│   │   └── hotel_management_app.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── docker-compose.yml              # Run all services together
└── README.md                    # This file
```

## Getting Started

### Prerequisites
- Python 3.12+
- uv package manager
- Docker and Docker Compose (for containerized deployment)
- SerpApi account
- Supabase project

### Quick Start with Docker Compose
```bash
# Clone repository
git clone <repository-url>
cd apps/hotel-management

# Set up environment variables
cp hotel-search-wrapper/.env.example hotel-search-wrapper/.env
cp saved-hotels/.env.example saved-hotels/.env
cp hotel-management/.env.example hotel-management/.env

# Edit environment files with your credentials
nano hotel-search-wrapper/.env
nano saved-hotels/.env

# Build and run all services
docker-compose up --build

# Services will be available at:
# - Hotel Management: http://localhost:5000
# - Hotel Search: http://localhost:5001
# - Saved Hotels: http://localhost:5002
```

### Individual Service Development
Each service can be developed and tested independently:

#### Hotel Search Wrapper
```bash
cd hotel-search-wrapper
cp .env.example .env
uv sync
python -u src/hotel_search_wrapper_app.py
```

#### Saved Hotels
```bash
cd saved-hotels
cp .env.example .env
uv sync
python -u src/saved_hotels_app.py
```

#### Hotel Management
```bash
cd hotel-management
cp .env.example .env
uv sync
python -u src/hotel_management_app.py
```

## API Usage

### Complete User Flow
1. **Search Hotels** - Frontend calls hotel-management `/api/search`
2. **Display Results** - Show search results to user
3. **User Selects Hotel** - User chooses a hotel from results
4. **Save Hotel** - Frontend calls hotel-management `/api/save-hotel` with hotel data
5. **View Details** - Frontend calls hotel-management `/api/hotels/<id>` to get details
6. **Update Price** - Frontend calls hotel-management `/api/hotels/<id>/fetch-latest-price`

### Service Communication
- **Protocol**: HTTP (REST)
- **Format**: JSON
- **Timeout**: 10 seconds
- **Error Handling**: HTTP status codes with JSON error messages

## Environment Variables

### Hotel Search Wrapper
```bash
SERPAPI_KEY=your_serpapi_key
```

### Saved Hotels
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### Hotel Management
```bash
SEARCH_SERVICE_URL=http://hotel-search-wrapper:5000
SAVED_HOTELS_SERVICE_URL=http://saved-hotels:5000
```

## Testing

### Health Checks
```bash
# Test all services
curl http://localhost:5000/health  # Hotel Management
curl http://localhost:5001/health  # Hotel Search
curl http://localhost:5002/health  # Saved Hotels
```

### Integration Test
```bash
# Test complete flow
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Singapore",
    "check_in_date": "2026-04-01",
    "check_out_date": "2026-04-02",
    "currency": "SGD"
  }'

# Save result
curl -X POST http://localhost:5000/api/save-hotel \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test_user",
    "trip_id": "test-trip-id",
    "hotel": { ...hotel_data... }
  }'
```

## Docker Configuration

### Network Architecture
- **Network Type**: Bridge network
- **Service Discovery**: DNS-based service names
- **Inter-service Communication**: Internal network (hotel-network)
- **External Access**: Port mapping to host

### Container Ports
- `hotel-management`: 5000 → host:5000
- `hotel-search-wrapper`: 5000 → host:5001
- `saved-hotels`: 5000 → host:5002

### Build Process
1. Each service builds from its own Dockerfile
2. Uses multi-stage builds for optimization
3. Base image: python:3.12-slim
4. Package manager: uv for fast dependency installation

## Production Deployment

### Deployment Options
1. **Docker Compose** (Recommended for development/testing)
2. **Kubernetes** (Recommended for production)
3. **Individual Docker containers** (For manual scaling)
4. **Cloud deployment** (AWS, GCP, Azure)

### Scaling Considerations
- **Hotel Search Wrapper**: Stateless, can scale horizontally
- **Saved Hotels**: Database-dependent, connection pooling recommended
- **Hotel Management**: Stateless, can scale based on load

## Monitoring and Logging
- **Health Endpoints**: All services have `/health` endpoints
- **Logs**: Docker Compose provides aggregated logs
- **Error Handling**: Structured error responses with status codes
- **Timeouts**: 10-second default timeout for service communication

## Dependencies

### Hotel Search Wrapper
- google-search-results>=2.4.2
- python-dotenv>=1.0.0
- flask>=3.1.3

### Saved Hotels
- supabase>=2.0.0
- python-dotenv>=1.0.0
- flask>=3.1.3

### Hotel Management
- flask>=3.1.3
- python-dotenv>=1.0.0
- requests>=2.31.0

## Maintenance

### Updating Services
Each service can be updated independently:
```bash
# Update specific service
docker-compose up hotel-search-wrapper --build

# Update all services
docker-compose up --build
```

### Database Migrations
Saved Hotels service uses Supabase. Run migrations through Supabase dashboard or SQL scripts.

### Configuration Management
- Environment variables for service configuration
- .env.example files for reference
- No hardcoded credentials
- Docker Compose for environment injection

## Troubleshooting

### Service Communication Issues
1. Check service URLs in environment variables
2. Verify all services are running
3. Check Docker network connectivity
4. Review service logs: `docker-compose logs <service>`

### Database Connection Issues
1. Verify Supabase credentials
2. Check Supabase project status
3. Test database connectivity
4. Review Supabase logs

### API Key Issues
1. Verify SerpApi key is valid
2. Check SerpApi account limits
3. Test API connectivity directly
4. Review SerpApi dashboard

## License
MIT

## Support
For issues or questions, please refer to individual service README files:
- [Hotel Search Wrapper](./hotel-search-wrapper/README.md)
- [Saved Hotels](./saved-hotels/README.md)
- [Hotel Management](./hotel-management/README.md)
