"""Hotel Management Composite Microservice - Orchestrator between search wrapper and saved hotels."""
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Import the services (using relative imports since they're in the same package)
try:
    from hotel_search_wrapper import hotel_search_service
    from saved_hotels import saved_hotels_service
except ImportError:
    # Fallback for direct execution
    from hotel_management.hotel_search_wrapper import hotel_search_service
    from hotel_management.saved_hotels import saved_hotels_service


class HotelManagementService:
    """Composite microservice for orchestrating hotel search and saved hotels operations."""

    def __init__(self):
        """Initialize the Hotel Management Service."""
        self.search_service = hotel_search_service
        self.saved_hotels_service = saved_hotels_service

    def search_hotels(
        self,
        query: str,
        check_in_date: str,
        check_out_date: str,
        adults: int = 2,
        children: int = 0,
        currency: str = "SGD",
        hl: str = "en",
        sort_by: Optional[int] = None,
        rating: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Search for hotels without saving to the database.

        This function only searches using the hotel_search_wrapper
        and returns the raw search results for suggestions or custom queries.

        Args:
            query: Search query for hotels (e.g., "hotels near Singapore")
            check_in_date: Check-in date in YYYY-MM-DD format
            check_out_date: Check-out date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            children: Number of children (default: 0)
            currency: Currency for prices (default: "SGD")
            hl: Language code (default: "en")
            sort_by: Sort option (optional)
                - 3: Lowest price
                - 8: Highest rating
                - 13: Most reviewed
            rating: Rating filter (optional)
                - 7: 3.5+
                - 8: 4.0+
                - 9: 4.5+

        Returns:
            Dictionary containing:
            - search_results: Raw search results from SerpApi
            - status: Operation status
        """
        try:
            # Search for hotels using wrapper service
            search_results = self.search_service.search_hotels(
                query=query,
                check_in_date=check_in_date,
                check_out_date=check_out_date,
                adults=adults,
                children=children,
                currency=currency,
                hl=hl,
                sort_by=sort_by,
                rating=rating,
            )

            return {
                "search_results": search_results,
                "status": "success",
            }

        except Exception as e:
            return {
                "search_results": None,
                "status": "error",
                "error": str(e),
            }

    def save_hotel_to_database(
        self,
        uid: str,
        trip_id: str,
        hotel_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Save a selected hotel to the database.

        This function takes hotel details that were retrieved from the search endpoint
        and saves them to the database using the saved_hotels service.

        Args:
            uid: User ID who is saving the hotel
            trip_id: Trip ID to associate the hotel with
            hotel_data: Hotel details (name, dates, rates, amenities, photos, etc.)

        Returns:
            Dictionary containing:
            - saved_hotel: Hotel saved to database
            - status: Operation status
        """
        try:
            # Extract required fields from hotel data
            name = hotel_data.get("name")
            check_in_date = hotel_data.get("check_in_date")
            check_out_date = hotel_data.get("check_out_date")

            if not name or not check_in_date or not check_out_date:
                return {
                    "saved_hotel": None,
                    "status": "error",
                    "error": "name, check_in_date, and check_out_date are required in hotel data",
                }

            # Parse dates
            datetime_check_in = self._parse_date(check_in_date)
            datetime_check_out = self._parse_date(check_out_date)

            # Create hotel using saved_hotels service
            saved_hotel = self.saved_hotels_service.create_hotel(
                name=name,
                datetime_check_in=datetime_check_in,
                datetime_check_out=datetime_check_out,
                trip_id=trip_id,
                description=hotel_data.get("description"),
                external_link=hotel_data.get("external_link"),
                link=hotel_data.get("link"),
                overall_rating=hotel_data.get("overall_rating"),
                rate_per_night=hotel_data.get("rate_per_night"),
                lat=hotel_data.get("lat"),
                long=hotel_data.get("long"),
                amenities=hotel_data.get("amenities"),
                photos=hotel_data.get("photos"),
            )

            return {
                "saved_hotel": saved_hotel,
                "uid": uid,
                "trip_id": trip_id,
                "status": "success",
            }

        except Exception as e:
            return {
                "saved_hotel": None,
                "status": "error",
                "error": str(e),
            }


    def _transform_search_result_to_saved_hotel(
        self,
        search_result: Dict[str, Any],
        trip_id: str,
        check_in_date: str,
        check_out_date: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Transform SerpApi search result to saved_hotels schema.

        Maps search result fields to database schema fields:
        - name, description, rating, amenities
        - Links (external and internal)
        - Location (lat, long)
        - Cost, dates

        Args:
            search_result: Raw search result from SerpApi
            trip_id: Trip UUID
            check_in_date: Check-in date string (YYYY-MM-DD)
            check_out_date: Check-out date string (YYYY-MM-DD)

        Returns:
            Transformed hotel data or None if no valid hotel found
        """
        try:
            # Extract hotel data - SerpApi can return either:
            # 1. A single hotel object (specific queries)
            # 2. A "properties" array (general queries)
            if "properties" in search_result and search_result["properties"]:
                # Get first property from the array
                hotel_data = search_result["properties"][0]
            elif "name" in search_result:
                # Single hotel object
                hotel_data = search_result
            else:
                return None

            # Transform name
            name = hotel_data.get("name", "")

            if not name:
                return None

            # Transform check-in/out dates to datetime
            datetime_check_in = self._parse_date(check_in_date)
            datetime_check_out = self._parse_date(check_out_date)

            # Transform description (may not be present in properties)
            description = hotel_data.get("description", "")

            # Transform links
            external_link = hotel_data.get("link", "")
            link = hotel_data.get("property_token", "")

            # Transform rating
            overall_rating = self._extract_rating(hotel_data)

            # Transform cost (rate per night)
            rate_per_night = self._extract_rate_per_night(hotel_data)

            # Transform location
            lat, long = self._extract_location(hotel_data)

            # Transform amenities
            amenities = self._extract_amenities(hotel_data)

            # Transform photos (max 3)
            photos = self._extract_photos(hotel_data)

            # Build transformed hotel data
            transformed_data = {
                "name": name,
                "datetime_check_in": datetime_check_in,
                "datetime_check_out": datetime_check_out,
                "trip_id": trip_id,
            }

            # Add optional fields
            if description:
                transformed_data["description"] = description
            if external_link:
                transformed_data["external_link"] = external_link
            if link:
                transformed_data["link"] = link
            if overall_rating is not None:
                transformed_data["overall_rating"] = overall_rating
            if rate_per_night is not None:
                transformed_data["rate_per_night"] = rate_per_night
            if lat is not None:
                transformed_data["lat"] = lat
            if long is not None:
                transformed_data["long"] = long
            if amenities:
                transformed_data["amenities"] = amenities
            if photos:
                transformed_data["photos"] = photos

            return transformed_data

        except Exception as e:
            print(f"Error transforming hotel data: {str(e)}")
            return None

    def _save_transformed_hotel_to_database(self, hotel_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Save transformed hotel data to the database.

        Args:
            hotel_data: Transformed hotel data matching saved_hotels schema

        Returns:
            Saved hotel data from database or None if failed
        """
        try:
            saved_hotel = self.saved_hotels_service.create_hotel(**hotel_data)
            return saved_hotel
        except Exception as e:
            print(f"Error saving hotel to database: {str(e)}")
            return None

    def save_hotel_to_database(
        self,
        uid: str,
        trip_id: str,
        hotel_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Save a selected hotel to the database.

        This function takes hotel details that were retrieved from the search endpoint
        and saves them to the database using the saved_hotels service.

        Args:
            uid: User ID who is saving the hotel
            trip_id: Trip ID to associate the hotel with
            hotel_data: Hotel details (name, dates, rates, amenities, photos, etc.)

        Returns:
            Dictionary containing:
            - saved_hotel: Hotel saved to database
            - status: Operation status
        """
        try:
            # Extract required fields from hotel data
            name = hotel_data.get("name")
            check_in_date = hotel_data.get("check_in_date")
            check_out_date = hotel_data.get("check_out_date")

            if not name or not check_in_date or not check_out_date:
                return {
                    "saved_hotel": None,
                    "status": "error",
                    "error": "name, check_in_date, and check_out_date are required in hotel data",
                }

            # Parse dates
            datetime_check_in = self._parse_date(check_in_date)
            datetime_check_out = self._parse_date(check_out_date)

            # Create hotel using saved_hotels service
            saved_hotel = self.saved_hotels_service.create_hotel(
                name=name,
                datetime_check_in=datetime_check_in,
                datetime_check_out=datetime_check_out,
                trip_id=trip_id,
                description=hotel_data.get("description"),
                external_link=hotel_data.get("external_link"),
                link=hotel_data.get("link"),
                overall_rating=hotel_data.get("overall_rating"),
                rate_per_night=hotel_data.get("rate_per_night"),
                lat=hotel_data.get("lat"),
                long=hotel_data.get("long"),
                amenities=hotel_data.get("amenities"),
                photos=hotel_data.get("photos"),
            )

            return {
                "saved_hotel": saved_hotel,
                "uid": uid,
                "trip_id": trip_id,
                "status": "success",
            }

        except Exception as e:
            return {
                "saved_hotel": None,
                "status": "error",
                "error": str(e),
            }

    def _parse_date(self, date_string: str) -> datetime:
        """Parse date string to datetime object."""
        try:
            return datetime.strptime(date_string, "%Y-%m-%d")
        except Exception:
            return datetime.now()

    def _extract_rating(self, hotel_data: Dict[str, Any]) -> Optional[float]:
        """Extract rating from hotel data."""
        rating = hotel_data.get("overall_rating")
        if rating is not None:
            try:
                return float(rating)
            except (ValueError, TypeError):
                pass
        return None

    def get_hotel_by_id(
        self,
        hotel_id: str,
    ) -> Dict[str, Any]:
        """
        Get hotel details by hotel ID.

        This method retrieves a hotel from the saved_hotels service
        by its database ID.

        Args:
            hotel_id: Hotel UUID to retrieve

        Returns:
            Dictionary containing:
            - hotel: Hotel details from database
            - status: Operation status
        """
        try:
            hotel = self.saved_hotels_service.get_hotel(hotel_id)

            if not hotel:
                return {
                    "hotel": None,
                    "status": "error",
                    "error": "Hotel not found",
                }

            return {
                "hotel": hotel,
                "status": "success",
            }

        except Exception as e:
            return {
                "hotel": None,
                "status": "error",
                "error": str(e),
            }

    def _extract_rate_per_night(self, hotel_data: Dict[str, Any]) -> Optional[float]:
        """Extract rate per night from hotel data."""
        # Try different field names for price
        rate_per_night = hotel_data.get("rate_per_night")

        if rate_per_night is not None:
            try:
                # Handle dictionary structure (e.g., {'extracted_lowest': 392, 'lowest': '$392'})
                if isinstance(rate_per_night, dict):
                    return rate_per_night.get("extracted_lowest") or rate_per_night.get("extracted_before_taxes_fees")
                # Handle string value (e.g., '$392')
                else:
                    cost_str = str(rate_per_night).replace("$", "").replace(",", "").strip()
                    return float(cost_str)
            except (ValueError, TypeError):
                pass
        return None

    def _extract_decimal(self, hotel_data: Dict[str, Any], field: str, index: int = 0) -> Optional[float]:
        """Extract decimal value from nested field."""
        value = hotel_data.get(field)
        if value and isinstance(value, list) and len(value) > index:
            try:
                return float(value[index])
            except (ValueError, TypeError):
                pass
        return None

    def _extract_location(self, hotel_data: Dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
        """Extract latitude and longitude from hotel data."""
        gps = hotel_data.get("gps_coordinates", {})
        if isinstance(gps, dict):
            lat = gps.get("latitude")
            long = gps.get("longitude")
            if lat is not None and long is not None:
                try:
                    return float(lat), float(long)
                except (ValueError, TypeError):
                    pass
        return None, None

    def _extract_amenities(self, hotel_data: Dict[str, Any]) -> Optional[List[str]]:
        """Extract amenities from hotel data."""
        amenities = (
            hotel_data.get("amenities") or
            hotel_data.get("facilities") or
            hotel_data.get("features")
        )

        if amenities:
            if isinstance(amenities, list):
                return [str(a) for a in amenities]
            elif isinstance(amenities, str):
                return amenities.split(",")
        return None

    def _extract_photos(self, hotel_data: Dict[str, Any]) -> Optional[List[str]]:
        """Extract up to 3 photo URLs from hotel data."""
        photos = (
            hotel_data.get("photos") or
            hotel_data.get("images") or
            hotel_data.get("thumbnails")
        )

        if photos:
            if isinstance(photos, list):
                # Extract photo URLs from list of objects or strings
                photo_urls = []
                for photo in photos[:3]:  # Limit to 3 photos
                    if isinstance(photo, dict):
                        # If it's a dict, try to find the URL
                        url = photo.get("url") or photo.get("src") or photo.get("thumbnail")
                        if url:
                            photo_urls.append(url)
                    elif isinstance(photo, str):
                        photo_urls.append(photo)
                return photo_urls[:3] if len(photo_urls) > 3 else photo_urls
            elif isinstance(photos, str):
                return [photos][:3]  # Return single photo as list, limited to 1
        return None

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello hotel-management - Composite orchestrator service is running"


# Initialize the service instance
hotel_management_service = HotelManagementService()
