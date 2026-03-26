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

    # Timeout settings
    REQUEST_TIMEOUT = 30  # seconds
