from __future__ import annotations

import os

from attractions.supabase_client import get_supabase_client


class SupabaseAttractionRepository:
    def __init__(self, table_name: str | None = None, id_column: str | None = None):
        self.table_name = table_name or os.getenv("ATTRACTIONS_TABLE", "attractions")
        self.id_column = id_column or os.getenv(
            "ATTRACTION_ID_COLUMN", "attraction_id"
        )
        self.catalog_table_name = os.getenv("ATTRACTIONS_CATALOG_TABLE", "attractions_catalog")
        self.catalog_id_column = os.getenv(
            "ATTRACTIONS_CATALOG_ID_COLUMN", "catalog_attraction_id"
        )

    def _table(self):
        return get_supabase_client().table(self.table_name)

    def _catalog_table(self):
        return get_supabase_client().table(self.catalog_table_name)

    def list_attractions(self) -> list[dict]:
        response = self._table().select("*").order("created_at", desc=False).execute()
        return response.data or []

    def list_attractions_by_trip(self, trip_id: str) -> list[dict]:
        response = (
            self._table()
            .select("*")
            .eq("trip_id", trip_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    def list_catalog_attractions(self, search: str | None = None) -> list[dict]:
        query = self._catalog_table().select("*")
        if search:
            like_pattern = f"%{search}%"
            query = query.or_(
                f"name.ilike.{like_pattern},location.ilike.{like_pattern}"
            )
        response = query.order("name", desc=False).execute()
        return response.data or []

    def get_catalog_attraction(self, catalog_attraction_id: str) -> dict | None:
        response = (
            self._catalog_table()
            .select("*")
            .eq(self.catalog_id_column, catalog_attraction_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def get_attraction(self, attraction_id: str) -> dict | None:
        response = (
            self._table()
            .select("*")
            .eq(self.id_column, attraction_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def create_attraction(self, payload: dict) -> dict:
        response = self._table().insert(payload).execute()
        return response.data[0]

    def create_attraction_from_catalog(
        self, trip_id: str, catalog_attraction_id: str, payload: dict | None = None
    ) -> dict | None:
        catalog_attraction = self.get_catalog_attraction(catalog_attraction_id)
        if catalog_attraction is None:
            return None

        trip_attraction_payload = {
            "trip_id": trip_id,
            "name": catalog_attraction["name"],
            "location": catalog_attraction.get("location"),
            "gmaps_link": catalog_attraction.get("gmaps_link"),
            "cost": catalog_attraction.get("cost"),
            "catalog_attraction_id": catalog_attraction_id,
        }
        if payload:
            trip_attraction_payload.update(payload)

        response = self._table().insert(trip_attraction_payload).execute()
        return response.data[0]

    def update_attraction(self, attraction_id: str, payload: dict) -> dict | None:
        response = (
            self._table()
            .update(payload)
            .eq(self.id_column, attraction_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_attraction(self, attraction_id: str) -> dict | None:
        response = self._table().delete().eq(self.id_column, attraction_id).execute()
        return response.data[0] if response.data else None
