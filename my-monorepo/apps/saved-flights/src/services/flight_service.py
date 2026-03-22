from typing import List, Optional, Dict, Any
from ..supabase_client import SupabaseFlightClient
from ..logging_config import get_logger
from ..utils.validators import parse_datetime
import uuid

logger = get_logger(__name__)


class FlightService:
    def __init__(self, db: Optional[Any] = None):
        """
        Initialize FlightService with Supabase client
        db parameter kept for backward compatibility but not used
        """
        self.client = SupabaseFlightClient()

    def create_flight(self, data: dict) -> str:
        """Create a new flight and return its UUID ID"""
        try:
            logger.debug(f"Creating flight: {data['flight_number']}")
            flight_id = self.client.create_flight(data)
            logger.debug(f"Flight created with ID: {flight_id}")
            return flight_id
        except Exception as e:
            logger.error(f"Error creating flight: {str(e)}")
            raise

    def get_flight(self, flight_id: str) -> Dict[str, Any]:
        """Get a flight by UUID ID"""
        try:
            logger.debug(f"Fetching flight: {flight_id}")
            flight = self.client.get_flight(flight_id)
            logger.info(f"Successfully retrieved flight {flight_id}")
            return flight
        except Exception as e:
            logger.error(f"Error getting flight: {str(e)}")
            raise

    def get_flights_by_trip(self, trip_id: str) -> List[Dict[str, Any]]:
        """Get all flights for a specific trip by UUID"""
        try:
            logger.debug(f"Fetching flights for trip: {trip_id}")
            flights = self.client.get_flights_by_trip(trip_id)
            logger.info(f"Retrieved {len(flights)} flights for trip {trip_id}")
            return flights
        except Exception as e:
            logger.error(f"Error getting flights by trip: {str(e)}")
            raise

    def get_all_flights(self) -> List[Dict[str, Any]]:
        """Get all flights"""
        try:
            logger.debug("Fetching all flights")
            flights = self.client.get_all_flights()
            logger.info(f"Retrieved {len(flights)} flights total")
            return flights
        except Exception as e:
            logger.error(f"Error getting all flights: {str(e)}")
            raise

    def update_flight(self, flight_id: str, data: dict) -> Dict[str, Any]:
        """Update a flight"""
        try:
            logger.debug(f"Updating flight: {flight_id}")
            flight = self.client.update_flight(flight_id, data)
            logger.info(f"Successfully updated flight {flight_id}")
            return flight
        except Exception as e:
            logger.error(f"Error updating flight: {str(e)}")
            raise

    def delete_flight(self, flight_id: str) -> bool:
        """Delete a flight"""
        try:
            logger.debug(f"Deleting flight: {flight_id}")
            self.client.delete_flight(flight_id)
            logger.info(f"Successfully deleted flight {flight_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting flight: {str(e)}")
            raise