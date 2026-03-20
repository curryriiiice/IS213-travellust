# attractions

Dedicated attractions microservice for TravelLust.

## What it does

- `GET /health` checks the service is up
- `GET /api/attractions` lists all attractions
- `GET /api/trips/<trip_id>/attractions` lists attractions for one trip
- `GET /api/attractions/<attraction_id>` fetches one attraction
- `POST /api/attractions` creates an attraction
- `PUT /api/attractions/<attraction_id>` updates an attraction
- `DELETE /api/attractions/<attraction_id>` deletes an attraction

## Environment variables

- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_KEY`: your Supabase API key
- `ATTRACTIONS_TABLE`: table name, defaults to `attractions`
- `ATTRACTION_ID_COLUMN`: primary key column, defaults to `id`
- `PORT`: Flask port, defaults to `5002`

Copy `.env.example` to `.env` and fill in your values.

## Run locally

```bash
cd apps/attractions
uv sync
uv run python -m flask --app attractions.app:app run --port 5002 --debug
```

## Example requests

```bash
curl http://127.0.0.1:5002/health
curl http://127.0.0.1:5002/api/attractions
curl http://127.0.0.1:5002/api/trips/22222222-2222-2222-2222-222222222222/attractions
curl http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111
curl -X POST http://127.0.0.1:5002/api/attractions \
  -H "Content-Type: application/json" \
  -d '{"trip_id":"22222222-2222-2222-2222-222222222222","name":"Gardens by the Bay","location":"Singapore","duration_minutes":180,"cost":32.50}'
curl -X PUT http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111 \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes":200}'
curl -X DELETE http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111
```
