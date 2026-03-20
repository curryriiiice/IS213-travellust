# attractions

Dedicated attractions microservice for TravelLust.

## What it does

- `GET /health` checks the service is up
- `GET /api/catalog/attractions` lists searchable catalog attractions
- `GET /api/catalog/attractions/<catalog_attraction_id>` fetches one catalog attraction
- `GET /api/attractions` lists all attractions
- `GET /api/trips/<trip_id>/attractions` lists attractions for one trip
- `GET /api/attractions/<attraction_id>` fetches one attraction
- `POST /api/trips/<trip_id>/attractions/from-catalog` copies a catalog attraction into a trip
- `POST /api/attractions` creates an attraction
- `PUT /api/attractions/<attraction_id>` updates an attraction
- `DELETE /api/attractions/<attraction_id>` deletes an attraction

## Environment variables

- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_KEY`: your Supabase API key
- `ATTRACTIONS_TABLE`: table name, defaults to `attractions`
- `ATTRACTION_ID_COLUMN`: primary key column, defaults to `attraction_id`
- `ATTRACTIONS_CATALOG_TABLE`: catalog table name, defaults to `attractions_catalog`
- `ATTRACTIONS_CATALOG_ID_COLUMN`: catalog primary key column, defaults to `catalog_attraction_id`
- `PORT`: Flask port, defaults to `5002`

Copy `.env.example` to `.env` and fill in your values.

## Run locally

```bash
cd apps/attractions
uv sync
uv run python -m flask --app attractions.app:app run --port 5002 --debug
```

