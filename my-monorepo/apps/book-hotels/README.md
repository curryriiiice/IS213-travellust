# Book Hotels Composite Microservice

Composite microservice for orchestrating hotel bookings. This service integrates with trips_atomic, hotel-management, and booked_tickets services to provide a complete hotel booking workflow.

## Features

- Hotel booking orchestration
- Hotel ownership verification
- Hotel details retrieval with latest pricing
- Booking simulation with failure chance (1 in 50)
- AMQP integration for booking events
- Integration with multiple microservices

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns service status

### Book Hotel
- **POST** `/api/book-hotel`
  - Request body:
    ```json
    {
      "trip_id": "string",
      "user_id": "string",
      "hotel_id": "string",
      "ticket_holder_userids": ["string", "string"]
    }
    ```
  - Returns booking confirmation or error

### Verify Hotel Ownership
- **POST** `/api/verify-hotel-ownership`
  - Request body:
    ```json
    {
      "trip_id": "string",
      "hotel_id": "string"
    }
    ```
  - Returns ownership status

### Get Hotel Details
- **GET** `/api/hotels/<hotel_id>/details`
  - Returns hotel details with latest price

## Environment Variables

- `TRIPS_ATOMIC_URL`: URL for trips_atomic service
- `HOTEL_MANAGEMENT_URL`: URL for hotel-management service
- `BOOKED_TICKETS_URL`: URL for booked_tickets service
- `AMQP_URL`: AMQP broker URL
- `AMQP_EXCHANGE`: AMQP exchange name
- `AMQP_ROUTING_KEY_ACTIVITY`: AMQP routing key for activities
- `AMQP_ROUTING_KEY_ERROR`: AMQP routing key for errors

## Running with Docker

```bash
# Build image
docker-compose build book-hotels

# Run service
docker-compose up book-hotels
```

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask app
flask --app book_hotels.book_hotels_app run --host=0.0.0.0
```
