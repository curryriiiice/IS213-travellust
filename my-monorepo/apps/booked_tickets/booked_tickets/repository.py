from __future__ import annotations

import os

from booked_tickets.supabase_client import supabase


class SupabaseBookedTicketRepository:
    def __init__(self, table_name: str | None = None, id_column: str | None = None):
        self.table_name = table_name or os.getenv("BOOKED_TICKETS_TABLE", "booked_tickets")
        self.id_column = id_column or os.getenv("BOOKED_TICKET_ID_COLUMN", "booked_ticket_id")

    def _table(self):
        return supabase.table(self.table_name)

    def list_booked_tickets(self) -> list[dict]:
        response = self._table().select("*").order(self.id_column, desc=False).execute()
        return response.data or []

    def list_booked_tickets_by_user(self, user_id: str) -> list[dict]:
        response = (
            self._table()
            .select("*")
            .eq("user_id", user_id)
            .order(self.id_column, desc=False)
            .execute()
        )
        return response.data or []

    def get_booked_ticket(self, booked_ticket_id: str) -> dict | None:
        response = (
            self._table()
            .select("*")
            .eq(self.id_column, booked_ticket_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def create_booked_ticket(self, payload: dict) -> dict:
        response = self._table().insert(payload).execute()
        return response.data[0]

    def update_booked_ticket(self, booked_ticket_id: str, payload: dict) -> dict | None:
        response = (
            self._table()
            .update(payload)
            .eq(self.id_column, booked_ticket_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_booked_ticket(self, booked_ticket_id: str) -> dict | None:
        response = (
            self._table()
            .delete()
            .eq(self.id_column, booked_ticket_id)
            .execute()
        )
        return response.data[0] if response.data else None
