import requests
from typing import Dict, List, Tuple
from ..config import Config
from ..utils.api_errors import ExternalServiceError


class BookedTicketsClient:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.base_url = f"http://{config.BOOKED_TICKETS_HOST}:{config.BOOKED_TICKETS_PORT}"

    def create_booking(self, paid_by: str, fha_id: str, user_id: str, cost: float) -> bool:
        """
        Call booked_tickets service to create a booking
        Returns True if successful
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/bookings",
                json={
                    "paid_by": paid_by,
                    "fha_id": fha_id,
                    "user_id": user_id,
                    "cost": cost
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result.get('success', False)
        except requests.Timeout:
            raise ExternalServiceError("Request to booked_tickets timed out")
        except requests.RequestException as e:
            raise ExternalServiceError(f"Error connecting to booked_tickets: {str(e)}")

    def create_bulk_bookings(
        self, paid_by: str, fha_id: str, user_ids: List[str], cost: float
    ) -> Tuple[int, int]:
        """
        Create bookings for multiple users
        Returns (success_count, failure_count)
        """
        success_count = 0
        failure_count = 0

        for user_id in user_ids:
            try:
                self.create_booking(paid_by, fha_id, user_id, cost)
                success_count += 1
            except ExternalServiceError:
                failure_count += 1

        return success_count, failure_count
