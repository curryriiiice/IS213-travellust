import requests
from typing import List, Dict, Optional
from .config import Config
from .utils.api_errors import ExternalAPIError


def convert_usd_to_sgd(amount: float, exchange_rate: float = 1.34) -> float:
    """
    Convert USD to SGD using the provided exchange rate.
    Default exchange rate is 1.34 (1 USD = 1.34 SGD)
    """
    return round(amount * exchange_rate, 2)


class FlightAPIClient:
    """Client for FlightAPI (flightapi.io) roundtrip flight searches"""

    def __init__(self, config: Config):
        self.config = config
        self.api_key = config.FLIGHTAPI_KEY
        self.base_url = config.FLIGHTAPI_BASE_URL
        self.headers = {
            'Content-Type': 'application/json'
        }

    def search_flights(self, origin: str, destination: str,
                       departure_date: str, return_date: str,
                       currency: str = 'USD',
                       cabin_class: str = None) -> List[Dict]:
        """
        Search roundtrip flights using FlightAPI
        Input validation and error handling
        Returns list of flight dictionaries
        """
        try:
            # Use defaults from config if not provided
            if cabin_class is None:
                cabin_class = self.config.FLIGHTAPI_DEFAULT_CABIN_CLASS

            # Extract just date part (YYYY-MM-DD) from ISO 8601 format
            departure_date_simple = departure_date.split('T')[0]
            return_date_simple = return_date.split('T')[0]

            # Construct the FlightAPI roundtrip URL
            # Format: https://api.flightapi.io/roundtrip/<api-key>/<departure_airport_code>/<arrival_airport_code>/<departure_date>/<arrival_date>/<number_of_adults>/<number_of_childrens>/<number_of_infants>/<cabin_class>/<currency>
            url = (
                f"{self.base_url}/roundtrip/{self.api_key}/"
                f"{origin}/{destination}/{departure_date_simple}/{return_date_simple}/"
                f"{self.config.FLIGHTAPI_DEFAULT_ADULTS}/"
                f"{self.config.FLIGHTAPI_DEFAULT_CHILDREN}/"
                f"{self.config.FLIGHTAPI_DEFAULT_INFANTS}/"
                f"{cabin_class}/{currency}"
            )

            print(f"🔍 FlightAPI request: {url}")

            # Make the request with appropriate timeout
            response = requests.get(url, headers=self.headers, timeout=60)

            if response.status_code == 200:
                data = response.json()
                return self._parse_flights(data, origin, destination,
                                           departure_date_simple, return_date_simple)
            elif response.status_code == 400:
                raise ExternalAPIError("Invalid search parameters or airport codes")
            elif response.status_code == 401:
                raise ExternalAPIError("Invalid FlightAPI key")
            elif response.status_code == 403:
                raise ExternalAPIError("Access forbidden - check API permissions")
            elif response.status_code == 429:
                raise ExternalAPIError("API rate limit exceeded")
            else:
                raise ExternalAPIError(f"FlightAPI error: {response.status_code}")

        except requests.Timeout:
            raise ExternalAPIError("Request to FlightAPI timed out")
        except requests.RequestException as e:
            raise ExternalAPIError(f"Error connecting to FlightAPI: {str(e)}")

    def _parse_flights(self, data: Dict, origin: str, destination: str,
                       departure_date: str, return_date: str) -> List[Dict]:
        """Parse FlightAPI response into standardized format"""
        flights = []

        # FlightAPI response has itineraries, segments, and carriers
        itineraries = data.get('itineraries', [])
        segments = data.get('segments', [])
        carriers = data.get('carriers', [])

        # Create lookup dicts
        segments_dict = {s['id']: s for s in segments}
        carriers_dict = {c['id']: c for c in carriers}

        # Build Google Flights search URL for this route
        from urllib.parse import quote
        google_flights_query = f"Flights from {origin} to {destination} on {departure_date} through {return_date}"
        external_link = f"https://www.google.com/travel/flights?q={quote(google_flights_query)}"

        for itinerary in itineraries:
            try:
                flight_info = self._parse_itinerary(itinerary, segments_dict,
                                                     carriers_dict, external_link)
                if flight_info:
                    flights.append(flight_info)
            except (KeyError, TypeError) as e:
                print(f"⚠️  Parsing error for itinerary: {e}")
                continue

        # Sort by price (cheapest first) and return top 5
        flights.sort(key=lambda f: f.get('price_sgd', float('inf')))
        return flights[:5]

    def _parse_itinerary(self, itinerary: Dict, segments_dict: Dict,
                         carriers_dict: Dict, external_link: str) -> Optional[Dict]:
        """Parse a single flight itinerary from FlightAPI response"""
        # segment_ids are inside pricing_options[0]['items'][0]['segment_ids']
        segment_ids = []
        pricing_options = itinerary.get('pricing_options', [])
        if pricing_options and 'items' in pricing_options[0] and pricing_options[0]['items']:
            segment_ids = pricing_options[0]['items'][0].get('segment_ids', [])

        if not segment_ids:
            return None

        # Get first and last segments
        first_segment = segments_dict.get(segment_ids[0])
        last_segment = segments_dict.get(segment_ids[-1])

        if not first_segment or not last_segment:
            return None

        # Extract flight number from first segment
        flight_number = first_segment.get('marketing_flight_number', '')

        # Extract airline from carriers using marketing_carrier_id
        carrier_id = first_segment.get('marketing_carrier_id')
        carrier = carriers_dict.get(carrier_id, {})
        airline = carrier.get('name', carrier.get('display_code', ''))

        # Extract times
        departure_time = first_segment.get('departure', '')
        arrival_time = last_segment.get('arrival', '')

        # Extract price from first pricing option
        price_usd = 0.0
        pricing_options = itinerary.get('pricing_options', [])
        if pricing_options:
            price_info = pricing_options[0].get('price', {})
            if isinstance(price_info, dict):
                price_usd = price_info.get('amount', 0.0)

        # Convert to SGD
        price_sgd = convert_usd_to_sgd(price_usd, self.config.USD_TO_SGD_RATE)

        return {
            'flight_number': flight_number,
            'airline': airline,
            'datetime_departure': departure_time,
            'datetime_arrival': arrival_time,
            'price_usd': price_usd,
            'price_sgd': price_sgd,
            'currency': 'USD',
            'external_link': external_link
        }

