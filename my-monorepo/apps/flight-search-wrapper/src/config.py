import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # SerpApi Configuration
    SERPAPI_KEY = os.getenv('SERPAPI_KEY')
    SERPAPI_CURRENCY = os.getenv('SERPAPI_CURRENCY', 'SGD')

    # Legacy FlightAPI Configuration (kept for reference, not used)
    FLIGHTAPI_KEY = os.getenv('FLIGHTAPI_KEY')
    FLIGHTAPI_BASE_URL = os.getenv('FLIGHTAPI_BASE_URL', 'https://api.flightapi.io')
    FLIGHTAPI_DEFAULT_CURRENCY = os.getenv('FLIGHTAPI_DEFAULT_CURRENCY', 'USD')
    FLIGHTAPI_DEFAULT_CABIN_CLASS = os.getenv('FLIGHTAPI_DEFAULT_CABIN_CLASS', 'Economy')
    FLIGHTAPI_DEFAULT_ADULTS = int(os.getenv('FLIGHTAPI_DEFAULT_ADULTS', 1))
    FLIGHTAPI_DEFAULT_CHILDREN = int(os.getenv('FLIGHTAPI_DEFAULT_CHILDREN', 0))
    FLIGHTAPI_DEFAULT_INFANTS = int(os.getenv('FLIGHTAPI_DEFAULT_INFANTS', 0))

    # Currency Conversion
    USD_TO_SGD_RATE = float(os.getenv('USD_TO_SGD_RATE', 1.34))

    # General Configuration
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
