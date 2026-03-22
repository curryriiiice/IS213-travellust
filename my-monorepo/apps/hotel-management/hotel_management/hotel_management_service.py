"""Hotel Management Composite Microservice - Orchestrator between search wrapper and saved hotels."""
import os
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

    def search_and_save_hotel(
        self,
        query: str,
        check_in_date: str,
        check_out_date: str,
        trip_id: str,
        adults: int = 2,
        children: int = 0,
        currency: str = "SGD",
        gl: str = "sg",
        hl: str = "en",
        sort_by: Optional[int] = None,
        rating: Optional[int] = None,
        save_to_database: bool = True,
    ) -> Dict[str, Any]:
        """
        Search for hotels and optionally save the first result to the database.

        This orchestrator function:
        1. Calls the hotel_search_wrapper to get search results
        2. Transforms/filters the search results to match saved_hotels schema
        3. Saves the hotel to the database if save_to_database is True

        Args:
            query: Search query for hotels (e.g., "Bali Resorts")
            check_in_date: Check-in date in YYYY-MM-DD format
            check_out_date: Check-out date in YYYY-MM-DD format
            trip_id: Trip UUID (required for saving to database)
            adults: Number of adults (default: 2)
            children: Number of children (default: 0)
            currency: Currency for prices (default: "SGD")
            gl: Two-letter country code (default: "sg" for Singapore)
            hl: Language code (default: "en")
            sort_by: Sort option (optional)
                - 3: Lowest price
                - 8: Highest rating
                - 13: Most reviewed
            rating: Rating filter (optional)
                - 7: 3.5+
                - 8: 4.0+
                - 9: 4.5+
            save_to_database: Whether to save the hotel to database (default: True)

        Returns:
            Dictionary containing:
            - search_results: Raw search results from SerpApi
            - transformed_hotel: Hotel data transformed for saved_hotels schema
            - saved_hotel: Hotel saved to database (if save_to_database=True)
            - status: Operation status
        """
        try:
            # Step 1: Search for hotels using the wrapper service
            search_results = self.search_service.search_hotels(
                query=query,
                check_in_date=check_in_date,
                check_out_date=check_out_date,
                adults=adults,
                children=children,
                currency=currency,
                gl=gl,
                hl=hl,
                sort_by=sort_by,
                rating=rating,
            )

            # Step 2: Transform/filter search results to match saved_hotels schema
            transformed_hotel = self._transform_search_result_to_saved_hotel(
                search_result=search_results,
                trip_id=trip_id,
                check_in_date=check_in_date,
                check_out_date=check_out_date,
            )

            # Step 3: Save to database if requested
            saved_hotel = None
            if save_to_database and transformed_hotel:
                saved_hotel = self._save_hotel_to_database(transformed_hotel)

            return {
                "search_results": search_results,
                "transformed_hotel": transformed_hotel,
                "saved_hotel": saved_hotel,
                "status": "success",
            }

        except Exception as e:
            return {
                "search_results": None,
                "transformed_hotel": None,
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

            return transformed_data

        except Exception as e:
            print(f"Error transforming hotel data: {str(e)}")
            return None

    def _save_hotel_to_database(self, hotel_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello hotel-management - Composite orchestrator service is running"


# Initialize the service instance
hotel_management_service = HotelManagementService()
