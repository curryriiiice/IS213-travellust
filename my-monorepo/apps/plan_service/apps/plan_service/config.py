import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask settings
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    # Flight Management service connection
    FLIGHT_MANAGEMENT_HOST = os.getenv("FLIGHT_MANAGEMENT_HOST", "flight-management")
    FLIGHT_MANAGEMENT_PORT = int(os.getenv("FLIGHT_MANAGEMENT_PORT", 5000))

    # Hotel Management service connection
    HOTEL_MANAGEMENT_HOST = os.getenv("HOTEL_MANAGEMENT_HOST", "hotel-management")
    HOTEL_MANAGEMENT_PORT = int(os.getenv("HOTEL_MANAGEMENT_PORT", 5000))

    # Trips Atomic service connection
    TRIPS_ATOMIC_HOST = os.getenv("TRIPS_ATOMIC_HOST", "trips_atomic")
    TRIPS_ATOMIC_PORT = int(os.getenv("TRIPS_ATOMIC_PORT", 5000))

    # Saved Hotels service connection
    SAVED_HOTELS_HOST = os.getenv("SAVED_HOTELS_HOST", "saved-hotels")
    SAVED_HOTELS_PORT = int(os.getenv("SAVED_HOTELS_PORT", 5000))

    # Attractions service connection
    ATTRACTIONS_HOST = os.getenv("ATTRACTIONS_HOST", "attractions")
    ATTRACTIONS_PORT = int(os.getenv("ATTRACTIONS_PORT", 5000))

    # Redis connection
    REDIS_HOST = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

    # Timeout settings
    REQUEST_TIMEOUT = 30  # seconds
