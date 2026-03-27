import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from root directory
root_dir = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=root_dir / '.env')


class Config:
    # SerpApi Configuration
    SERPAPI_KEY = os.getenv('SERPAPI_KEY')
    SERPAPI_CURRENCY = os.getenv('SERPAPI_CURRENCY', 'SGD')

    # Currency Conversion
    USD_TO_SGD_RATE = float(os.getenv('USD_TO_SGD_RATE', 1.34))

    # General Configuration
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
