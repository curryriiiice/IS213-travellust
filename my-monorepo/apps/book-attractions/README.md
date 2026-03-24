# book-attractions

Composite service that orchestrates attraction booking using the `attractions`,
`trips`, and `booked_tickets` microservices.

## What it does

- `GET /health` checks the service is up
- `POST /api/book-attractions` validates trip users, fetches attraction details, and creates booked tickets

## Request flow

The request must include:

- `user_id` as a list of ticket holder user IDs
- `trip_id`
- `paid_by` as the payer's user ID
- `attraction_id`

The request may also include:

- `cost`
- `cancelled`

This service first fetches the trip from the trips microservice, reads the trip's
user IDs, and checks that the payer and every ticket holder belong to the trip.

It then fetches the attraction from the attractions microservice and forwards that
attraction id as `f_h_a_id` to `booked_tickets`.

Before calling `booked_tickets`, the service simulates a 1-in-5 booking failure.
This is useful for testing unsuccessful bookings now and prepares the flow for a
future activity-log microservice via AMQP.

One booked ticket record is created per ticket holder.

## Environment variables

- `ATTRACTIONS_SERVICE_URL`: base URL for the attractions service
- `BOOKED_TICKETS_SERVICE_URL`: base URL for the booked_tickets service
- `TRIPS_GET_TRIP_URL_TEMPLATE`: URL template to fetch a trip by id. Use `{trip_id}` as the placeholder.
- `PORT`: Flask port, defaults to `5010`

## Run locally

```bash
cd apps/book-attractions
uv sync
uv run python -m flask --app book_attractions.app:app run --port 5010 --debug
```

## Example request

```bash
curl -X POST http://127.0.0.1:5010/api/book-attractions \
  -H "Content-Type: application/json" \
  -d '{"user_id":[1,2],"trip_id":"22222222-2222-2222-2222-222222222222","attraction_id":"11111111-1111-1111-1111-111111111111","cost":"99.99","paid_by":1}'
```
