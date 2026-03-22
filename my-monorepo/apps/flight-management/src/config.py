import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SEARCH_WRAPPER_HOST = os.getenv('SEARCH_WRAPPER_HOST', 'flight-search-wrapper')
    SEARCH_WRAPPER_PORT = int(os.getenv('SEARCH_WRAPPER_PORT', 5000))
    SAVED_FLIGHTS_HOST = os.getenv('SAVED_FLIGHTS_HOST', 'saved-flghts')
    SAVED_FLIGHTS_PORT = int(os.getenv('SAVED_FLIGHTS_PORT', 5000))
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
