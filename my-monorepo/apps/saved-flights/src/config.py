import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database configuration
    USE_SQLITE = os.getenv('USE_SQLITE', 'false').lower() == 'true'

    # Supabase configuration (new approach - preferred)
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')

    # Legacy database URL (kept for backward compatibility)
    DATABASE_URL = os.getenv('DATABASE_URL')  # Only required when not using SQLite and not using Supabase client

    # Flask configuration
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if cls.USE_SQLITE:
            # SQLite mode - no database credentials needed
            return True

        # Check if we have Supabase credentials (preferred approach)
        if cls.SUPABASE_URL and cls.SUPABASE_KEY:
            # Using Supabase client - good to go!
            return True

        # Fall back to DATABASE_URL check (legacy approach)
        if not cls.DATABASE_URL:
            raise ValueError("Either SUPABASE_URL and SUPABASE_KEY, or DATABASE_URL environment variable is required")

        return True


# Validate configuration on import
Config.validate()
