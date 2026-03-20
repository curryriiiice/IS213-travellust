from __future__ import annotations

import os

from attractions.supabase_client import get_supabase_client


class SupabaseAttractionRepository:
    def __init__(self, table_name: str | None = None, id_column: str | None = None):
        self.table_name = table_name or os.getenv("ATTRACTIONS_TABLE", "attractions")
        self.id_column = id_column or os.getenv(
            "ATTRACTION_ID_COLUMN", "attraction_id"
        )

    def _table(self):
        return get_supabase_client().table(self.table_name)

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
