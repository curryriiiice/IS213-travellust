# attractions

Dedicated attractions microservice for TravelLust.

## What it does

- `GET /health` checks the service is up
- `GET /api/catalog/attractions` lists searchable catalog attractions
- `GET /api/catalog/attractions/<catalog_attraction_id>` fetches one catalog attraction
- `GET /api/attractions` lists all attractions
- `GET /api/trips/<trip_id>/attractions` lists attractions for one trip
- `GET /api/attractions/<attraction_id>` fetches one attraction
- `POST /api/trips/<trip_id>/attractions` adds an attraction into a trip, either manually or from the catalog
- `POST /api/trips/<trip_id>/attractions/from-catalog` copies a catalog attraction into a trip
- `POST /api/attractions` creates an attraction
- `PUT /api/trips/<trip_id>/attractions/<attraction_id>` updates an attraction inside one trip
- `DELETE /api/trips/<trip_id>/attractions/<attraction_id>` soft deletes an attraction inside one trip

## Environment variables

- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_KEY`: your Supabase API key
- `ATTRACTIONS_TABLE`: table name, defaults to `attractions`
- `ATTRACTION_ID_COLUMN`: primary key column, defaults to `attraction_id`
- `ATTRACTIONS_CATALOG_TABLE`: catalog table name, defaults to `attractions_catalog`
- `ATTRACTIONS_CATALOG_ID_COLUMN`: catalog primary key column, defaults to `catalog_attraction_id`
- `TRIPS_SERVICE_URL`: base URL for `trips_atomic`, defaults to `http://trips_atomic:5000`
- `TRIPS_TABLE_NAME`: trips table name used by `trips_atomic`, defaults to `trips`
- `PORT`: Flask port, defaults to `5002`
- `deleted`: add this boolean column in your attractions table with default `false`

Copy `.env.example` to `.env` and fill in your values.

## Run locally

```bash
cd apps/attractions
uv sync
uv run python -m flask --app attractions.app:app run --port 5002 --debug
```

## Create inside a trip

`POST /api/trips/<trip_id>/attractions`

This route supports 2 request body shapes.
Before creating the attraction, the service verifies that the `trip_id` exists in
`trips_atomic`. After the attraction is created, it updates the matching trip and
appends only the new `attraction_id` into `trip.attraction_ids`.

Manual create:

```json
{
  "name": "Universal Studios Singapore",
  "location": "Sentosa",
  "gmaps_link": "https://maps.google.com/example",
  "visit_time": "2026-03-21T12:00:00Z",
  "duration_minutes": 240,
  "cost": "88.00"
}
```

Example:

```bash
curl -X POST http://localhost:5002/api/trips/<trip_id>/attractions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Universal Studios Singapore",
    "location": "Sentosa",
    "visit_time": "2026-03-21T12:00:00Z",
    "duration_minutes": 240,
    "cost": "88.00"
  }'
```

Add from catalog:

```json
{
  "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
  "visit_time": "2026-03-21T12:00:00Z",
  "duration_minutes": 180,
  "cost": "32.50"
}
```

Example:

```bash
curl -X POST http://localhost:5002/api/trips/<trip_id>/attractions \
  -H "Content-Type: application/json" \
  -d '{
    "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
    "visit_time": "2026-03-21T12:00:00Z",
    "duration_minutes": 180
  }'
```

The legacy `POST /api/trips/<trip_id>/attractions/from-catalog` route still works, but the unified trip route above is the cleaner one to use.

Legacy catalog route body:

`POST /api/trips/<trip_id>/attractions/from-catalog?catalog_attraction_id=<catalog_attraction_id>`

```json
{
  "visit_time": "2026-03-21T12:00:00Z",
  "duration_minutes": 180,
  "cost": "32.50"
}
```

## Create with explicit trip_id

`POST /api/attractions`

This route also verifies that the `trip_id` exists in `trips_atomic` and then
appends the newly created `attraction_id` into that trip's `attraction_ids`.

```json
{
  "trip_id": "9bcb60a4-b690-4d52-88f7-345626c903d5",
  "name": "Universal Studios Singapore",
  "location": "Sentosa",
  "gmaps_link": "https://maps.google.com/example",
  "visit_time": "2026-03-21T12:00:00Z",
  "duration_minutes": 240,
  "cost": "88.00"
}
```

## Update inside a trip

`PUT /api/trips/<trip_id>/attractions/<attraction_id>`

```json
{
  "visit_time": "2026-03-21T14:00:00Z",
  "duration_minutes": 210,
  "cost": "40.00"
}
```

You can update any combination of:
- `trip_id`
- `name`
- `location`
- `gmaps_link`
- `visit_time`
- `duration_minutes`
- `cost`

## Soft Delete SQL

```sql
alter table public.attractions
add column if not exists deleted boolean not null default false;
```
