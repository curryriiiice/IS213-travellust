import requests
from typing import List, Dict, Optional
from .config import Config
from .utils.api_errors import ExternalAPIError


def convert_to_sgd(amount: float, exchange_rate: float = 1.34) -> float:
    """
    Convert USD to SGD using the provided exchange rate.
    Default exchange rate is 1.34 (1 USD = 1.34 SGD).
    If amount is 0, return 0.
    """
    if amount == 0:
        return 0.0
    return round(amount * exchange_rate, 2)


class SerpApiClient:
    """Client for SerpApi Google Flights API (one-way flights)"""

    def __init__(self, config: Config):
        self.config = config
        self.api_key = config.SERPAPI_KEY
        self.base_url = "https://serpapi.com/search"
        self.headers = {
            'Content-Type': 'application/json'
        }

    def search_flights(self, origin: str, destination: str,
                       departure_date: str,
                       currency: str = 'SGD') -> List[Dict]:
        """
        Search one-way flights using SerpApi Google Flights API
        Returns list of flight dictionaries aggregated as single journeys
        """
        try:
            # Extract just date part (YYYY-MM-DD) from ISO 8601 format
            departure_date_simple = departure_date.split('T')[0]

            # Build query parameters for SerpApi
            params = {
                'engine': 'google_flights',
                'departure_id': origin,
                'arrival_id': destination,
                'outbound_date': departure_date_simple,
                'type': '2',  # One-way
                'currency': currency,
                'adults': '1',  # Fixed at 1 adult
                'travel_class': '1',  # Economy
                'api_key': self.api_key,
                'hl': 'en',
                'gl': 'sg',  # Singapore region
            }

            print(f"🔍 SerpApi request: departure_id={origin}, arrival_id={destination}, date={departure_date_simple}")

            # Make the request
            response = requests.get(self.base_url, params=params, headers=self.headers, timeout=60)

            if response.status_code == 200:
                data = response.json()
                return self._parse_flights(data, origin, destination)
            elif response.status_code == 400:
                raise ExternalAPIError("Invalid search parameters or airport codes")
            elif response.status_code == 401:
                raise ExternalAPIError("Invalid SerpApi key")
            elif response.status_code == 403:
                raise ExternalAPIError("Access forbidden - check API permissions")
            elif response.status_code == 429:
                raise ExternalAPIError("API rate limit exceeded")
            else:
                raise ExternalAPIError(f"SerpApi error: {response.status_code}")

        except requests.Timeout:
            raise ExternalAPIError("Request to SerpApi timed out")
        except requests.RequestException as e:
            raise ExternalAPIError(f"Error connecting to SerpApi: {str(e)}")

    def _parse_flights(self, data: Dict, origin: str, destination: str) -> List[Dict]:
        """Parse SerpApi response into standardized format (single journey aggregation)"""
        flights = []

        # Get best_flights and other_flights
        best_flights = data.get('best_flights', [])
        other_flights = data.get('other_flights', [])
        all_flights = best_flights + other_flights

        # Get Google Flights URL from metadata
        google_flights_url = data.get('search_metadata', {}).get('google_flights_url',
                                                          'https://www.google.com/travel/flights')

        # Limit to 50 flights
        all_flights = all_flights[:50]

        for journey in all_flights:
            try:
                flight_info = self._parse_journey(journey, google_flights_url, origin, destination)
                if flight_info:
                    flights.append(flight_info)
            except (KeyError, TypeError) as e:
                print(f"⚠️  Parsing error for journey: {e}")
                continue

        # Sort by price (cheapest first)
        flights.sort(key=lambda f: f.get('price_sgd', float('inf')))
        return flights

    def _parse_journey(self, journey: Dict, google_flights_url: str, origin: str, destination: str) -> Optional[Dict]:
        """
        Parse a multi-leg journey into a single flight entry

        For a journey with legs like: SIN → LHR → AUS
        - flight_number: First leg's flight number
        - airline: Operating airline(s) - use first leg's airline for simplicity
        - datetime_departure: First leg's departure time
        - datetime_arrival: Last leg's arrival time
        - price: Journey price
        - aircraft_type: First leg's aircraft type
        - legroom: First leg's legroom
        - co2_kg: Journey's carbon emissions in kg
        - origin: Origin airport code
        - destination: Destination airport code
        """
        flights_list = journey.get('flights', [])
        if not flights_list:
            return None

        # Get first and last flight legs
        first_flight = flights_list[0]
        last_flight = flights_list[-1]

        # Extract flight info from first leg
        flight_number = first_flight.get('flight_number', '')

        # Use first leg's airline
        airline = first_flight.get('airline', '')

        # Departure time from first leg
        departure_airport = first_flight.get('departure_airport', {})
        datetime_departure = departure_airport.get('time', '')

        # Arrival time from last leg
        arrival_airport = last_flight.get('arrival_airport', {})
        datetime_arrival = arrival_airport.get('time', '')

        # Get price
        price = journey.get('price', 0)

        # Determine currency and convert prices
        currency_used = self.config.SERPAPI_CURRENCY if hasattr(self.config, 'SERPAPI_CURRENCY') else 'SGD'
        price_usd = price
        price_sgd = price

        # If price is in USD (not SGD), convert to SGD
        if currency_used.upper() != 'SGD' and price > 0:
            price_sgd = convert_to_sgd(price, self.config.USD_TO_SGD_RATE)
            price_usd = price
        elif price > 0:
            price_usd = round(price / self.config.USD_TO_SGD_RATE, 2)

        # Use Google Flights URL with booking token for external link
        booking_token = journey.get('booking_token', '')
        if booking_token:
            external_link = f"{google_flights_url}&booking_token={booking_token}"
        else:
            external_link = google_flights_url

        # Extract aircraft type from first leg
        aircraft_type = first_flight.get('airplane', None)

        # Extract legroom from first leg
        legroom = first_flight.get('legroom', None)

        # Extract CO2 in kg from journey-level carbon_emissions (convert grams to kg)
        carbon_emissions = journey.get('carbon_emissions', {})
        co2_kg = None
        if carbon_emissions and 'this_flight' in carbon_emissions:
            co2_kg = round(carbon_emissions['this_flight'] / 1000, 2)

        return {
            'flight_number': flight_number,
            'airline': airline,
            'datetime_departure': datetime_departure,
            'datetime_arrival': datetime_arrival,
            'price_usd': price_usd,
            'price_sgd': price_sgd,
            'currency': currency_used,
            'external_link': external_link,
            'aircraft_type': aircraft_type,
            'legroom': legroom,
            'co2_kg': co2_kg,
            'origin': origin,
            'destination': destination
        }
