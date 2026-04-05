"""Saved Hotels Atomic Microservice for CRUD operations."""
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from supabase import Client, create_client

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

supabase: Client = create_client(url, key)


class SavedHotelsService:
    """Atomic microservice for managing saved hotels in Supabase."""

    def __init__(self):
        """Initialize the Saved Hotels Service."""
        self.table_name = "hotel"

    def create_hotel(
        self,
        name: str,
        datetime_check_in: datetime,
        datetime_check_out: datetime,
        trip_id: str,
        description: Optional[str] = None,
        external_link: Optional[str] = None,
        link: Optional[str] = None,
        overall_rating: Optional[float] = None,
        rate_per_night: Optional[float] = None,
        lat: Optional[float] = None,
        long: Optional[float] = None,
        amenities: Optional[List[str]] = None,
        photos: Optional[List[str]] = None,
        address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new saved hotel entry.

        Args:
            name: Hotel name (required)
            datetime_check_in: Check-in datetime (required)
            datetime_check_out: Check-out datetime (required)
            trip_id: Trip ID (required, UUID)
            description: Hotel description
            external_link: External booking link
            link: Internal link
            overall_rating: Overall rating (0-5)
            rate_per_night: Rate per night
            lat: Latitude
            long: Longitude
            amenities: List of amenities
            photos: List of photo URLs (max 3)
            address: Hotel address

        Returns:
            Dictionary containing the created hotel data
        """
        hotel_data = {
            "name": name,
            "datetime_check_in": datetime_check_in.isoformat(),
            "datetime_check_out": datetime_check_out.isoformat(),
            "trip_id": trip_id,
        }

        if description:
            hotel_data["description"] = description
        if external_link:
            hotel_data["external_link"] = external_link
        if link:
            hotel_data["link"] = link
        if overall_rating is not None:
            hotel_data["overall_rating"] = overall_rating
        if rate_per_night is not None:
            hotel_data["rate_per_night"] = rate_per_night
        if lat is not None:
            hotel_data["lat"] = lat
        if long is not None:
            hotel_data["long"] = long
        if amenities:
            hotel_data["amenities"] = amenities
        if photos:
            # Limit to max 3 photos
            hotel_data["photos"] = photos[:3] if len(photos) > 3 else photos
        if address:
            hotel_data["address"] = address

        try:
            result = supabase.table(self.table_name).insert(hotel_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            raise Exception(f"Error creating hotel: {str(e)}")

    def get_hotel(self, hotel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a saved hotel by ID.

        Args:
            hotel_id: Hotel UUID

        Returns:
            Dictionary containing hotel data, or None if not found
        """
        try:
            result = supabase.table(self.table_name).select("*").eq("hotel_id", hotel_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            raise Exception(f"Error getting hotel: {str(e)}")

    def get_hotels_by_trip(self, trip_id: str) -> List[Dict[str, Any]]:
        """
        Get all saved hotels for a specific trip.

        Args:
            trip_id: Trip UUID

        Returns:
            List of hotel dictionaries
        """
        try:
            result = supabase.table(self.table_name).select("*").eq("trip_id", trip_id).execute()
            return result.data
        except Exception as e:
            raise Exception(f"Error getting hotels by trip: {str(e)}")

    def get_all_hotels(self) -> List[Dict[str, Any]]:
        """
        Get all saved hotels.

        Returns:
            List of all hotel dictionaries
        """
        try:
            result = supabase.table(self.table_name).select("*").execute()
            return result.data
        except Exception as e:
            raise Exception(f"Error getting all hotels: {str(e)}")

    def update_hotel(
        self,
        hotel_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        datetime_check_in: Optional[datetime] = None,
        datetime_check_out: Optional[datetime] = None,
        external_link: Optional[str] = None,
        link: Optional[str] = None,
        overall_rating: Optional[float] = None,
        rate_per_night: Optional[float] = None,
        lat: Optional[float] = None,
        long: Optional[float] = None,
        amenities: Optional[List[str]] = None,
        photos: Optional[List[str]] = None,
        address: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update a saved hotel.

        Args:
            hotel_id: Hotel UUID to update
            name: Updated hotel name
            description: Updated description
            datetime_check_in: Updated check-in datetime
            datetime_check_out: Updated check-out datetime
            external_link: Updated external link
            link: Updated internal link
            overall_rating: Updated rating
            rate_per_night: Updated rate per night
            lat: Updated latitude
            long: Updated longitude
            amenities: Updated list of amenities
            photos: Updated list of photos (max 3)
            address: Updated hotel address

        Returns:
            Dictionary containing the updated hotel data, or None if not found
        """
        update_data = {}

        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if datetime_check_in is not None:
            update_data["datetime_check_in"] = datetime_check_in.isoformat()
        if datetime_check_out is not None:
            update_data["datetime_check_out"] = datetime_check_out.isoformat()
        if external_link is not None:
            update_data["external_link"] = external_link
        if link is not None:
            update_data["link"] = link
        if overall_rating is not None:
            update_data["overall_rating"] = overall_rating
        if rate_per_night is not None:
            update_data["rate_per_night"] = rate_per_night
        if lat is not None:
            update_data["lat"] = lat
        if long is not None:
            update_data["long"] = long
        if amenities is not None:
            update_data["amenities"] = amenities
        if photos is not None:
            # Limit to max 3 photos
            update_data["photos"] = photos[:3] if len(photos) > 3 else photos
        if address is not None:
            update_data["address"] = address

        if not update_data:
            raise ValueError("No fields to update")

        try:
            result = supabase.table(self.table_name).update(update_data).eq("hotel_id", hotel_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            raise Exception(f"Error updating hotel: {str(e)}")

    def soft_delete_hotels(self, hotel_ids: List[str]) -> List[str]:
        """
        Soft delete multiple hotels by setting the deleted attribute to true.

        Args:
            hotel_ids: List of hotel UUIDs to soft delete

        Returns:
            List of successfully soft deleted hotel IDs
        """
        try:
            deleted_hotels = []
            for hotel_id in hotel_ids:
                result = supabase.table(self.table_name).update({"deleted": True}).eq("hotel_id", hotel_id).execute()
                if result.data:
                    deleted_hotels.append(hotel_id)
            return deleted_hotels
        except Exception as e:
            raise Exception(f"Error soft deleting hotels: {str(e)}")

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello saved-hotels - Service is running"


# Initialize the service instance
saved_hotels_service = SavedHotelsService()
