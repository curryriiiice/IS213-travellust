"""
Supabase Client for Saved Flights Microservice
Uses Supabase Python client instead of direct PostgreSQL connection
"""

import os
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any
from supabase import create_client, Client

class SupabaseFlightClient:
    """Supabase client for flight operations"""

    def __init__(self):
        """Initialize Supabase client"""
        # Get credentials from environment
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")

        # Create Supabase client
        self.client: Client = create_client(self.supabase_url, self.supabase_key)

    def _to_dict(self, flight_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert flight data to dictionary format (mimics SQLAlchemy to_dict)"""
        def safe_isoformat(val):
            """Return ISO string whether val is already a string or a datetime object"""
            if val is None:
                return None
            return val.isoformat() if hasattr(val, 'isoformat') else str(val)

        return {
            'flight_id': str(flight_data.get('flight_id')) if flight_data.get('flight_id') else None,
            'flight_number': flight_data.get('flight_number'),
            'airline': flight_data.get('airline'),
            'datetime_departure': safe_isoformat(flight_data.get('datetime_departure')),
            'datetime_arrival': safe_isoformat(flight_data.get('datetime_arrival')),
            'external_link': flight_data.get('external_link'),
            'trip_id': str(flight_data.get('trip_id')) if flight_data.get('trip_id') else None,
            'cost': float(flight_data.get('cost')) if flight_data.get('cost') is not None else None,
            'aircraft_type': flight_data.get('aircraft_type'),
            'legroom': flight_data.get('legroom'),
            'co2_kg': flight_data.get('co2_kg'),
            'origin': flight_data.get('origin'),
            'destination': flight_data.get('destination'),
            'created_at': safe_isoformat(flight_data.get('created_at'))
        }

    def create_flight(self, data: Dict[str, Any]) -> str:
        """Create a new flight and return its UUID"""
        try:
            # Log incoming data for debugging
            print(f"📥 Incoming flight data: {data}")
            print(f"🔍 Origin: {data.get('origin')}, Destination: {data.get('destination')}")

            # Prepare data for Supabase
            # Convert parsed datetime objects to ISO strings for JSON serialization
            dt_dep = data.get('datetime_departure_parsed') or data['datetime_departure']
            dt_arr = data.get('datetime_arrival_parsed') or data['datetime_arrival']

            flight_data = {
                'flight_number': data['flight_number'],
                'airline': data['airline'],
                'datetime_departure': dt_dep.isoformat() if hasattr(dt_dep, 'isoformat') else dt_dep,
                'datetime_arrival': dt_arr.isoformat() if hasattr(dt_arr, 'isoformat') else dt_arr,
                'external_link': data.get('external_link'),
                'trip_id': data.get('trip_id'),
                'cost': data['cost'],
                'aircraft_type': data.get('aircraft_type'),
                'legroom': data.get('legroom'),
                'co2_kg': data.get('co2_kg'),
                'origin': data.get('origin'),
                'destination': data.get('destination')
            }

            print(f"📤 Flight data to insert: {flight_data}")

            # Insert into Supabase
            result = self.client.table('flights').insert(flight_data).execute()

            # Return the flight_id
            if result.data and len(result.data) > 0:
                return str(result.data[0]['flight_id'])
            else:
                raise Exception("Failed to create flight - no data returned")

        except Exception as e:
            raise Exception(f"Error creating flight: {str(e)}")

    def get_flight(self, flight_id: str) -> Dict[str, Any]:
        """Get a flight by UUID ID"""
        try:
            result = self.client.table('flights').select('*').eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception(f"Flight with id {flight_id} not found")

            return self._to_dict(result.data[0])

        except Exception as e:
            if "not found" in str(e).lower():
                raise Exception(f"Flight with id {flight_id} not found")
            raise Exception(f"Error getting flight: {str(e)}")

    def get_flights_by_trip(self, trip_id: str) -> List[Dict[str, Any]]:
        """Get all flights for a specific trip by UUID"""
        try:
            result = self.client.table('flights').select('*').eq('trip_id', trip_id).execute()

            return [self._to_dict(flight) for flight in result.data]

        except Exception as e:
            raise Exception(f"Error getting flights by trip: {str(e)}")

    def get_all_flights(self) -> List[Dict[str, Any]]:
        """Get all flights"""
        try:
            result = self.client.table('flights').select('*').execute()

            return [self._to_dict(flight) for flight in result.data]

        except Exception as e:
            raise Exception(f"Error getting all flights: {str(e)}")

    def update_flight(self, flight_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a flight"""
        try:
            # Prepare update data (only include fields that are provided)
            update_data = {}
            if 'flight_number' in data:
                update_data['flight_number'] = data['flight_number']
            if 'airline' in data:
                update_data['airline'] = data['airline']
            if 'datetime_departure' in data:
                dt_dep = data.get('datetime_departure_parsed') or data['datetime_departure']
                update_data['datetime_departure'] = dt_dep.isoformat() if hasattr(dt_dep, 'isoformat') else dt_dep
            if 'datetime_arrival' in data:
                dt_arr = data.get('datetime_arrival_parsed') or data['datetime_arrival']
                update_data['datetime_arrival'] = dt_arr.isoformat() if hasattr(dt_arr, 'isoformat') else dt_arr
            if 'external_link' in data:
                update_data['external_link'] = data['external_link']
            if 'trip_id' in data:
                update_data['trip_id'] = data['trip_id']
            if 'cost' in data:
                update_data['cost'] = data['cost']
            if 'aircraft_type' in data:
                update_data['aircraft_type'] = data['aircraft_type']
            if 'legroom' in data:
                update_data['legroom'] = data['legroom']
            if 'co2_kg' in data:
                update_data['co2_kg'] = data['co2_kg']
            if 'origin' in data:
                update_data['origin'] = data['origin']
            if 'destination' in data:
                update_data['destination'] = data['destination']

            # Update in Supabase
            result = self.client.table('flights').update(update_data).eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception(f"Flight with id {flight_id} not found")

            return self._to_dict(result.data[0])

        except Exception as e:
            if "not found" in str(e).lower():
                raise Exception(f"Flight with id {flight_id} not found")
            raise Exception(f"Error updating flight: {str(e)}")

    def update_flight_with_validation(self, flight_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a flight with validation (checks if exists and not deleted)"""
        try:
            # Check if the flight exists
            result = self.client.table('flights').select('*').eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception("flight_id does not exist")

            flight = result.data[0]

            # Check if already deleted
            if flight.get('deleted'):
                raise Exception("flight has already been deleted")

            # Check if at least one field is provided for update
            updateable_fields = {'flight_number', 'airline', 'datetime_departure', 'datetime_arrival', 'external_link', 'trip_id', 'cost', 'aircraft_type', 'legroom', 'co2_kg', 'origin', 'destination'}
            fields_to_update = set(data.keys()) & updateable_fields

            if len(fields_to_update) == 0:
                raise Exception("at least one field must updated")

            # Prepare update data (only include fields that are provided)
            update_data = {}
            if 'flight_number' in data:
                update_data['flight_number'] = data['flight_number']
            if 'airline' in data:
                update_data['airline'] = data['airline']
            if 'datetime_departure' in data:
                dt_dep = data.get('datetime_departure_parsed') or data['datetime_departure']
                update_data['datetime_departure'] = dt_dep.isoformat() if hasattr(dt_dep, 'isoformat') else dt_dep
            if 'datetime_arrival' in data:
                dt_arr = data.get('datetime_arrival_parsed') or data['datetime_arrival']
                update_data['datetime_arrival'] = dt_arr.isoformat() if hasattr(dt_arr, 'isoformat') else dt_arr
            if 'external_link' in data:
                update_data['external_link'] = data['external_link']
            if 'trip_id' in data:
                update_data['trip_id'] = data['trip_id']
            if 'cost' in data:
                update_data['cost'] = data['cost']
            if 'aircraft_type' in data:
                update_data['aircraft_type'] = data['aircraft_type']
            if 'legroom' in data:
                update_data['legroom'] = data['legroom']
            if 'co2_kg' in data:
                update_data['co2_kg'] = data['co2_kg']
            if 'origin' in data:
                update_data['origin'] = data['origin']
            if 'destination' in data:
                update_data['destination'] = data['destination']

            # Update in Supabase
            result = self.client.table('flights').update(update_data).eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception("flight_id does not exist")

            return self._to_dict(result.data[0])

        except Exception as e:
            if "does not exist" in str(e).lower():
                raise Exception("flight_id does not exist")
            if "already been deleted" in str(e).lower():
                raise Exception("flight has already been deleted")
            if "at least one field must updated" in str(e).lower():
                raise Exception("at least one field must updated")
            raise Exception(f"Error updating flight: {str(e)}")

    def delete_flight(self, flight_id: str) -> bool:
        """Delete a flight"""
        try:
            result = self.client.table('flights').delete().eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception(f"Flight with id {flight_id} not found")

            return True

        except Exception as e:
            if "not found" in str(e).lower():
                raise Exception(f"Flight with id {flight_id} not found")
            raise Exception(f"Error deleting flight: {str(e)}")

    def soft_delete_flight(self, flight_id: str) -> str:
        """Soft delete a flight by setting deleted column to TRUE"""
        try:
            # First check if the flight exists
            result = self.client.table('flights').select('*').eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception(f"flight_id does not exist")

            flight = result.data[0]

            # Check if already deleted
            if flight.get('deleted'):
                raise Exception("flight has already been deleted")

            # Soft delete by setting deleted to TRUE
            update_result = self.client.table('flights').update({'deleted': True}).eq('flight_id', flight_id).execute()

            if not update_result.data or len(update_result.data) == 0:
                raise Exception(f"Failed to soft delete flight with id {flight_id}")

            return flight_id

        except Exception as e:
            # Re-raise with the specific error messages
            if "does not exist" in str(e).lower():
                raise Exception("flight_id does not exist")
            if "already been deleted" in str(e).lower():
                raise Exception("flight has already been deleted")
            raise Exception(f"Error soft deleting flight: {str(e)}")

    def test_connection(self) -> bool:
        """Test if Supabase connection is working"""
        try:
            # Simple test - try to query the flights table
            result = self.client.table('flights').select('flight_id').limit(1).execute()
            print("✅ Successfully connected to Supabase!")
            return True
        except Exception as e:
            print(f"❌ Supabase connection failed: {str(e)}")
            return False