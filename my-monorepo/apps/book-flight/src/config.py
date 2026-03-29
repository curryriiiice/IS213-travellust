import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    TRIPS_HOST = os.getenv('TRIPS_HOST', 'trips_atomic')
    TRIPS_PORT = int(os.getenv('TRIPS_PORT', 5001))
    FLIGHTS_HOST = os.getenv('FLIGHTS_HOST', 'flight-management')
    FLIGHTS_PORT = int(os.getenv('FLIGHTS_PORT', 5005))
    BOOKED_TICKETS_HOST = os.getenv('BOOKED_TICKETS_HOST', 'booked_tickets')
    BOOKED_TICKETS_PORT = int(os.getenv('BOOKED_TICKETS_PORT', 5006))
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
