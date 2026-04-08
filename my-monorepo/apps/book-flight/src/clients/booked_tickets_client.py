import requests
from typing import Dict, List, Tuple
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class BookedTicketsClient:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.base_url = f"http://{config.BOOKED_TICKETS_HOST}:{config.BOOKED_TICKETS_PORT}"

    def create_booking(self, paid_by: str, fha_id: str, user_id: str, cost: float) -> str:
        """
        Call booked_tickets service to create a booking.
        Returns the booked_ticket_id on success.
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/booked_tickets",
                json={
                    "paid_by": paid_by,
                    "f_h_a_id": fha_id,
                    "user_id": user_id,
                    "cost": cost
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            data = result.get("data", {})
            return data.get("booked_ticket_id", "")
        except requests.Timeout:
            raise ExternalServiceError("Request to booked_tickets timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to booked_tickets: {str(e)}")

    def create_bulk_bookings(
        self, paid_by: str, fha_id: str, user_ids: List[str], cost: float
    ) -> Tuple[int, int, List[str]]:
        """
        Create bookings for multiple users.
        Returns (success_count, failure_count, booking_ids)
        """
        success_count = 0
        failure_count = 0
        booking_ids: List[str] = []

        for user_id in user_ids:
            try:
                booking_id = self.create_booking(paid_by, fha_id, user_id, cost)
                success_count += 1
                if booking_id:
                    booking_ids.append(booking_id)
            except ExternalServiceError:
                failure_count += 1

        return success_count, failure_count, booking_ids
