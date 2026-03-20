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

## Example requests

```bash
curl http://127.0.0.1:5002/health
curl http://127.0.0.1:5002/api/catalog/attractions
curl "http://127.0.0.1:5002/api/catalog/attractions?search=singapore"
curl http://127.0.0.1:5002/api/catalog/attractions/aaaaaaa1-1111-1111-1111-111111111111
curl http://127.0.0.1:5002/api/attractions
curl http://127.0.0.1:5002/api/trips/22222222-2222-2222-2222-222222222222/attractions
curl http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111
curl -X POST "http://127.0.0.1:5002/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog?catalog_attraction_id=aaaaaaa1-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"visit_time":"2026-03-21T12:00:00Z","duration_minutes":180}'
curl -X POST http://127.0.0.1:5002/api/attractions \
  -H "Content-Type: application/json" \
  -d '{"trip_id":"22222222-2222-2222-2222-222222222222","name":"Gardens by the Bay","location":"Singapore","duration_minutes":180,"cost":32.50}'
curl -X PUT http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111 \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes":200}'
curl -X DELETE http://127.0.0.1:5002/api/attractions/11111111-1111-1111-1111-111111111111
```

## Supabase catalog SQL

```sql
create extension if not exists "pgcrypto";

create table if not exists public.attractions_catalog (
    catalog_attraction_id uuid primary key default gen_random_uuid(),
    name text not null,
    location text,
    gmaps_link text,
    cost numeric(10,2),
    category text,
    description text,
    image_url text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists attractions_catalog_name_idx
on public.attractions_catalog (name);

create index if not exists attractions_catalog_location_idx
on public.attractions_catalog (location);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists attractions_catalog_set_updated_at
on public.attractions_catalog;

create trigger attractions_catalog_set_updated_at
before update on public.attractions_catalog
for each row
execute function public.set_updated_at();

alter table public.attractions
add column if not exists catalog_attraction_id uuid null;

alter table public.attractions
add constraint attractions_catalog_attraction_id_fkey
foreign key (catalog_attraction_id)
references public.attractions_catalog (catalog_attraction_id)
on delete set null;
```
