import random
from typing import Dict
from ..clients.trips_client import TripsClient
from ..clients.flights_client import FlightsClient
from ..clients.booked_tickets_client import BookedTicketsClient
from ..config import Config
from ..utils.api_errors import ExternalServiceError, BookingError


class BookingService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.trips_client = TripsClient(config)
        self.flights_client = FlightsClient(config)
        self.booked_tickets_client = BookedTicketsClient(config)

    def book_flight(
        self, trip_id: str, user_id: str, user_ids: list, flight_id: str
    ) -> Dict:
        """
        Book a flight for multiple users

        Flow:
        1. Query trips_atomic to get trip details
        2. Validate user_id is in trip members
        3. Validate flight_id belongs to the trip
        4. Simulate 1/50 chance of failure
        5. Get flight details from flight-management
        6. Create bookings in booked_tickets for each user
        7. Return success message

        Returns: Dict with success message
        """
        # Step 1: Query trips_atomic
        trip_data = self.trips_client.get_trip(trip_id)

        # Step 1a: Validate user_id is in trip members
        member_ids = trip_data.get('memberids', [])
        if user_id not in member_ids:
            raise BookingError("A user is not part of this trip")

        # Step 1b: Validate flight_id belongs to the trip
        trip_flight_ids = trip_data.get('flight_ids', [])
        if flight_id not in trip_flight_ids:
            raise BookingError("This flight is not part of this trip")

        # Step 1.5: Simulate 1/50 chance of failure
        if random.randint(1, 50) == 1:
            raise BookingError("The booking has failed!")

        # Step 2: Get flight details from flight-management
        flight_data = self.flights_client.get_flight(flight_id)

        # Step 3: Create bookings for each user
        cost = flight_data.get('cost', 0)
        success_count, failure_count = self.booked_tickets_client.create_bulk_bookings(
            paid_by=user_id,
            fha_id=flight_id,
            user_ids=user_ids,
            cost=cost
        )

        # Step 4: Return appropriate message
        flight_number = flight_data.get('flight_number', 'Unknown')
        datetime_departure = flight_data.get('datetime_departure', 'Unknown')

        if failure_count == 0:
            message = f"Your flight {flight_number} on {datetime_departure} has been successfully booked for {success_count} people!"
            return {'success': True, 'message': message}
        else:
            total_count = success_count + failure_count
            message = f"Your flight {flight_number} on {datetime_departure} has been booked for {success_count} out of {total_count} users. {failure_count} bookings failed."
            return {'success': True, 'message': message}
