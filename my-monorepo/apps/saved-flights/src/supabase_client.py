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
            'created_at': safe_isoformat(flight_data.get('created_at'))
        }

    def create_flight(self, data: Dict[str, Any]) -> str:
        """Create a new flight and return its UUID"""
        try:
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
                'cost': data['cost']
            }

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

            # Update in Supabase
            result = self.client.table('flights').update(update_data).eq('flight_id', flight_id).execute()

            if not result.data or len(result.data) == 0:
                raise Exception(f"Flight with id {flight_id} not found")

            return self._to_dict(result.data[0])

        except Exception as e:
            if "not found" in str(e).lower():
                raise Exception(f"Flight with id {flight_id} not found")
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