"""Hotel Management Composite Microservice - Orchestrator between search wrapper and saved hotels."""
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import os

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class HotelManagementService:
    """Composite microservice for orchestrating hotel search and saved hotels operations."""

    def __init__(self):
        """Initialize the Hotel Management Service."""
        # Get service URLs from environment variables or use defaults
        self.search_service_url = os.getenv("SEARCH_SERVICE_URL", "http://hotel-search-wrapper:5000")
        self.saved_hotels_service_url = os.getenv("SAVED_HOTELS_SERVICE_URL", "http://saved-hotels:5000")
        self.trips_service_url = os.getenv("TRIPS_SERVICE_URL", "http://trips_atomic:5000")

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

        This function makes HTTP requests to the hotel_search_wrapper service
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
            import requests

            # Make HTTP request to search service
            url = f"{self.search_service_url}/api/search"
            payload = {
                "query": query,
                "check_in_date": check_in_date,
                "check_out_date": check_out_date,
                "adults": adults,
                "children": children,
                "currency": currency,
                "hl": hl,
            }

            if sort_by:
                payload["sort_by"] = sort_by
            if rating:
                payload["rating"] = rating

            response = requests.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                search_results = response.json().get("data")
                return {
                    "search_results": search_results,
                    "status": "success",
                }
            else:
                error_data = response.json()
                return {
                    "search_results": None,
                    "status": "error",
                    "error": error_data.get("error", "Search service error"),
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
        and makes HTTP requests to the saved_hotels service.

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
            import requests

            # Prepare hotel data for the saved_hotels service
            save_payload = {
                "name": hotel_data.get("name"),
                "check_in_date": hotel_data.get("check_in_date"),
                "check_out_date": hotel_data.get("check_out_date"),
                "trip_id": trip_id,
                "description": hotel_data.get("description"),
                "external_link": hotel_data.get("external_link"),
                "link": hotel_data.get("link"),
                "overall_rating": hotel_data.get("overall_rating"),
                "rate_per_night": hotel_data.get("rate_per_night"),
                "lat": hotel_data.get("lat"),
                "long": hotel_data.get("long"),
                "amenities": hotel_data.get("amenities"),
                "photos": hotel_data.get("photos"),
            }

            # Validate required fields
            if not save_payload["name"] or not save_payload["check_in_date"] or not save_payload["check_out_date"]:
                return {
                    "saved_hotel": None,
                    "status": "error",
                    "error": "name, check_in_date, and check_out_date are required in hotel data",
                }

            # Make HTTP request to saved_hotels service
            url = f"{self.saved_hotels_service_url}/api/hotels"
            payload = {
                "uid": uid,
                "trip_id": trip_id,
                "hotel": save_payload,
            }

            response = requests.post(url, json=payload, timeout=10)

            if response.status_code != 201:
                error_data = response.json()
                return {
                    "saved_hotel": None,
                    "status": "error",
                    "error": error_data.get("error", "Saved hotels service error"),
                }

            saved_hotel = response.json().get("data")

            # Extract hotel_id from the saved hotel
            hotel_id = saved_hotel.get("hotel_id")

            # Update the trip's hotel_ids array
            trip_url = f"{self.trips_service_url}/api/trips/{trip_id}"
            trip_response = requests.get(trip_url, timeout=10)

            if trip_response.status_code == 200:
                trip_data = trip_response.json().get("data", {})

                # Get existing hotel_ids array or create new one
                hotel_ids = trip_data.get("hotel_ids", [])
                if hotel_ids is None:
                    hotel_ids = []

                # Add new hotel_id to array if not already present
                if hotel_id not in hotel_ids:
                    hotel_ids.append(hotel_id)

                # Update the trip with new hotel_ids array
                update_response = requests.put(trip_url, json={"hotel_ids": hotel_ids}, timeout=10)

                if update_response.status_code != 200:
                    print(f"Warning: Failed to update trip's hotel_ids array: {update_response.status_code}")

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

        This method makes HTTP requests to the saved_hotels service
        to retrieve a hotel by its database ID.

        Args:
            hotel_id: Hotel UUID to retrieve

        Returns:
            Dictionary containing:
            - hotel: Hotel details from database
            - status: Operation status
        """
        try:
            import requests

            # Make HTTP request to saved_hotels service
            url = f"{self.saved_hotels_service_url}/api/hotels/{hotel_id}"

            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                result_data = response.json().get("data", {})

                if not result_data:
                    return {
                        "hotel": None,
                        "status": "error",
                        "error": "Hotel not found",
                    }

                return {
                    "hotel": result_data,
                    "status": "success",
                }
            elif response.status_code == 404:
                return {
                    "hotel": None,
                    "status": "error",
                    "error": "Hotel not found",
                }
            else:
                error_data = response.json()
                return {
                    "hotel": None,
                    "status": "error",
                    "error": error_data.get("error", "Saved hotels service error"),
                }

        except Exception as e:
            return {
                "hotel": None,
                "status": "error",
                "error": str(e),
            }

    def fetch_latest_price(
        self,
        hotel_id: str,
    ) -> Dict[str, Any]:
        """
        Fetch the latest price for a saved hotel and update the database.

        This function retrieves the hotel details from saved_hotels,
        searches for the latest price using the hotel search wrapper,
        and updates the hotel's rate_per_night in the database.

        Args:
            hotel_id: Hotel UUID to fetch and update price for

        Returns:
            Dictionary containing:
            - hotel: Updated hotel details
            - old_price: Previous rate_per_night
            - new_price: Latest rate_per_night
            - status: Operation status
        """
        try:
            import requests

            # Get hotel details from saved_hotels service
            hotel_url = f"{self.saved_hotels_service_url}/api/hotels/{hotel_id}"
            hotel_response = requests.get(hotel_url, timeout=10)

            if hotel_response.status_code != 200:
                return {
                    "hotel": None,
                    "old_price": None,
                    "new_price": None,
                    "status": "error",
                    "error": "Hotel not found",
                }

            hotel = hotel_response.json().get("data", {})

            if not hotel:
                return {
                    "hotel": None,
                    "old_price": None,
                    "new_price": None,
                    "status": "error",
                    "error": "Hotel not found",
                }

            # Extract hotel details needed for search
            hotel_name = hotel.get("name")
            check_in_str = hotel.get("datetime_check_in")
            check_out_str = hotel.get("datetime_check_out")

            if not hotel_name or not check_in_str or not check_out_str:
                return {
                    "hotel": hotel,
                    "old_price": None,
                    "new_price": None,
                    "status": "error",
                    "error": "Hotel name or dates not available",
                }

            # Parse dates from ISO format (handle None values)
            try:
                # Check if date strings are not None before calling .replace()
                if check_in_str:
                    clean_check_in = check_in_str.replace("Z", "+00:00")
                    datetime_check_in = datetime.fromisoformat(clean_check_in)
                else:
                    return {
                        "hotel": hotel,
                        "old_price": None,
                        "new_price": None,
                        "status": "error",
                        "error": "Check-in date not available in hotel data",
                    }

                if check_out_str:
                    clean_check_out = check_out_str.replace("Z", "+00:00")
                    datetime_check_out = datetime.fromisoformat(clean_check_out)
                else:
                    return {
                        "hotel": hotel,
                        "old_price": None,
                        "new_price": None,
                        "status": "error",
                        "error": "Check-out date not available in hotel data",
                    }
            except Exception as e:
                return {
                    "hotel": hotel,
                    "old_price": None,
                    "new_price": None,
                    "status": "error",
                    "error": f"Invalid date format: {str(e)}",
                }

            # Format dates for API call (YYYY-MM-DD)
            check_in_date = datetime_check_in.strftime("%Y-%m-%d")
            check_out_date = datetime_check_out.strftime("%Y-%m-%d")

            # Store old price
            old_price = hotel.get("rate_per_night")

            # Search for hotel to get latest price
            search_url = f"{self.search_service_url}/api/search"
            search_payload = {
                "query": f"hotels near {hotel_name}",
                "check_in_date": check_in_date,
                "check_out_date": check_out_date,
                "adults": 2,
                "children": 0,
                "currency": "SGD",
                "hl": "en",
            }

            search_response = requests.post(search_url, json=search_payload, timeout=10)

            if search_response.status_code != 200:
                return {
                    "hotel": hotel,
                    "old_price": old_price,
                    "new_price": old_price,
                    "status": "error",
                    "error": "Failed to fetch latest price from search service",
                }

            search_results = search_response.json().get("data", {})

            # Extract latest price from search results
            new_price = None
            if "properties" in search_results and search_results["properties"]:
                # Try to find the hotel with matching name in results
                for property_data in search_results["properties"]:
                    if property_data.get("name") == hotel_name:
                        rate_per_night_data = property_data.get("rate_per_night")
                        if rate_per_night_data:
                            if isinstance(rate_per_night_data, dict):
                                new_price = (
                                    rate_per_night_data.get("extracted_lowest")
                                    or rate_per_night_data.get("extracted_before_taxes_fees")
                                )
                            elif isinstance(rate_per_night_data, (int, float)):
                                new_price = float(rate_per_night_data)
                            elif isinstance(rate_per_night_data, str):
                                cost_str = rate_per_night_data.replace("$", "").replace(",", "").strip()
                                new_price = float(cost_str)
                        break
            elif "name" in search_results and search_results["name"] == hotel_name:
                # Single hotel result
                rate_per_night_data = search_results.get("rate_per_night")
                if rate_per_night_data:
                    if isinstance(rate_per_night_data, dict):
                        new_price = (
                            rate_per_night_data.get("extracted_lowest")
                            or rate_per_night_data.get("extracted_before_taxes_fees")
                        )
                    elif isinstance(rate_per_night_data, (int, float)):
                        new_price = float(rate_per_night_data)
                    elif isinstance(rate_per_night_data, str):
                        cost_str = rate_per_night_data.replace("$", "").replace(",", "").strip()
                        new_price = float(cost_str)

            if new_price is None:
                # If no price found in search, return hotel with current price
                return {
                    "hotel": hotel,
                    "old_price": old_price,
                    "new_price": old_price,
                    "status": "success",
                    "message": "Could not fetch latest price, using existing price",
                }

            # Update the hotel's rate_per_night in the database
            update_url = f"{self.saved_hotels_service_url}/api/hotels/{hotel_id}"
            update_response = requests.put(update_url, json={"rate_per_night": new_price}, timeout=10)

            if update_response.status_code != 200:
                return {
                    "hotel": hotel,
                    "old_price": old_price,
                    "new_price": None,
                    "status": "error",
                    "error": "Failed to update hotel price in database",
                }

            updated_hotel = update_response.json().get("data", {})

            if not updated_hotel:
                return {
                    "hotel": hotel,
                    "old_price": old_price,
                    "new_price": None,
                    "status": "error",
                    "error": "Failed to update hotel price in database",
                }

            return {
                "hotel": updated_hotel,
                "old_price": old_price,
                "new_price": new_price,
                "status": "success",
                "message": "Hotel price updated successfully",
            }

        except Exception as e:
            return {
                "hotel": None,
                "old_price": None,
                "new_price": None,
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
