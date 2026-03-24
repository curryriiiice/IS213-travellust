# book-attractions

Composite service that orchestrates attraction booking using the `attractions`,
`trips`, and `booked_tickets` microservices.

## What it does

- `GET /health` checks the service is up
- `POST /api/book-attractions` resolves a trip attraction and creates a booked ticket

## Request flow

The request must include:

- `user_id` as a list of ticket holder user IDs
- `trip_id`
- `paid_by` as the payer's user ID
- exactly one of `catalog_attraction_id` or `attraction_id`

The request may also include:

- `visit_time`
- `duration_minutes`
- `cost`
- `cancelled`

This service first checks that the payer and every ticket holder belong to the trip
through the trips microservice.

If `catalog_attraction_id` is provided, this service asks `attractions` to copy the
catalog item into the trip first, then forwards the resulting attraction id as
`f_h_a_id` to `booked_tickets`.

If `attraction_id` is provided, this service validates that the attraction exists
and belongs to the trip, then forwards that id as `f_h_a_id`.

One booked ticket record is created per ticket holder.

## Environment variables

- `ATTRACTIONS_SERVICE_URL`: base URL for the attractions service
- `BOOKED_TICKETS_SERVICE_URL`: base URL for the booked_tickets service
- `TRIPS_TRIP_MEMBERSHIP_URL_TEMPLATE`: URL template to verify whether a user belongs to a trip. Use `{trip_id}` and `{user_id}` as placeholders.
- `PORT`: Flask port, defaults to `5010`

## Run locally

```bash
cd apps/book-attractions
uv sync
uv run python -m flask --app book_attractions.app:app run --port 5010 --debug
```

## Example request

From catalog:

```bash
curl -X POST http://127.0.0.1:5010/api/book-attractions \
  -H "Content-Type: application/json" \
  -d '{"user_id":[1,2],"trip_id":"22222222-2222-2222-2222-222222222222","catalog_attraction_id":"aaaaaaa1-1111-1111-1111-111111111111","visit_time":"2026-03-25T10:00:00Z","duration_minutes":120,"cost":"99.99","paid_by":1}'
```

From an existing planned attraction:

```bash
curl -X POST http://127.0.0.1:5010/api/book-attractions \
  -H "Content-Type: application/json" \
  -d '{"user_id":[1,2],"trip_id":"22222222-2222-2222-2222-222222222222","attraction_id":"11111111-1111-1111-1111-111111111111","cost":"99.99","paid_by":1}'
```
