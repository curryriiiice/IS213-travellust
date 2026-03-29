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

The booking is only treated as successful if `booked_tickets` returns a saved
record with:

- a `booked_ticket_id`
- the same `user_id` that was submitted
- the same `f_h_a_id` as the attraction being booked

Before calling `booked_tickets`, the service simulates a 1-in-5 booking failure.
This is useful for testing unsuccessful bookings now and prepares the flow for a
future activity-log microservice via AMQP.

One booked ticket record is created per ticket holder.

## Environment variables

- `ATTRACTIONS_SERVICE_URL`: base URL for the attractions service
- `BOOKED_TICKETS_SERVICE_URL`: base URL for the booked_tickets service
- `TRIPS_GET_TRIP_URL_TEMPLATE`: URL template to fetch a trip by id. Use `{trip_id}` as the placeholder.
- `PORT`: Flask port, defaults to `5011`

## Run locally

```bash
cd apps/book-attractions
uv sync
uv run python -m flask --app book_attractions.app:app run --port 5011 --debug
```

## Example request

`POST /api/book-attractions`

Request body:

```json
{
  "user_id": [
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
  ],
  "trip_id": "9bcb60a4-b690-4d52-88f7-345626c903d5",
  "attraction_id": "11111111-1111-1111-1111-111111111111",
  "cost": "99.99",
  "paid_by": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "cancelled": false
}
```

Field meaning:

- `user_id`: array of ticket-holder user IDs
- `trip_id`: trip the attraction belongs to
- `attraction_id`: trip-specific attraction ID from the attractions service
- `cost`: optional override, otherwise the attraction cost is used
- `paid_by`: payer's user ID
- `cancelled`: optional flag, defaults to `false`

Example:

```bash
curl -X POST http://127.0.0.1:5011/api/book-attractions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": [
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
    ],
    "trip_id": "9bcb60a4-b690-4d52-88f7-345626c903d5",
    "attraction_id": "11111111-1111-1111-1111-111111111111",
    "cost": "99.99",
    "paid_by": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
  }'
```
