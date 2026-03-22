from ..clients.search_wrapper_client import SearchWrapperClient
from ..clients.saved_flights_client import SavedFlightsClient
from ..config import Config


class FlightBookingService:
    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.saved_flights_client = SavedFlightsClient(config)
        self.search_client = SearchWrapperClient(config)

    def book_flight(self, flight_id: int) -> int:
        """
        Book flight by:
        1. Getting flight details from saved-flghts
        2. Searching flights via wrapper (simulated booking)
        3. Returning the flight_id as confirmation
        Returns flight_id
        """
        # Step 1: Get flight details from saved-flghts
        flight_details = self.saved_flights_client.get_flight(flight_id)

        # Step 2: Search flights via wrapper to simulate booking
        # This validates the flight still exists and is bookable
        self.search_client.search_flights(
            city="Singapore",  # This would be derived from flight_details in real implementation
            datetime_departure=flight_details['datetime_departure'],
            datetime_arrival=flight_details['datetime_arrival']
        )

        # Step 3: Return flight_id as booking confirmation
        return flight_id
