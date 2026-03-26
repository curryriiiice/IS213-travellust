"""Hotel Search Wrapper Microservice for SerpApi Google Hotels integration."""
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from serpapi import GoogleSearch

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class HotelSearchWrapper:
    """Wrapper microservice for searching hotels using SerpApi Google Hotels."""

    def __init__(self):
        """Initialize the Hotel Search Wrapper with API key from environment."""
        self.api_key = os.getenv("SERPAPI_KEY")
        if not self.api_key:
            raise ValueError("SERPAPI_KEY environment variable is not set")

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
        Search for hotels using SerpApi Google Hotels.

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
            Dictionary containing search results from SerpApi
        """
        search_params = {
            "engine": "google_hotels",
            "q": query,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "adults": str(adults),
            "children": str(children),
            "currency": currency,
            "hl": hl,
            "api_key": self.api_key,
        }

        if sort_by:
            search_params["sort_by"] = sort_by

        if rating:
            search_params["rating"] = rating

        search = GoogleSearch(search_params)
        results = search.get_dict()
        return results

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello hotel-search-wrapper - Service is running"


# Initialize the service instance
hotel_search_service = HotelSearchWrapper()
