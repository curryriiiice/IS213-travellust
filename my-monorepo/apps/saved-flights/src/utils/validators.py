from datetime import datetime, timezone
from urllib.parse import urlparse
import uuid


def parse_datetime(dt_string: str) -> datetime:
    """
    Parse datetime string from flight-search-wrapper format to timezone-aware datetime.
    Flight-search-wrapper returns ISO format like "2026-04-08T15:05:00" (without timezone).
    We convert this to timezone-aware datetime for Supabase storage.
    """
    try:
        # Try parsing with timezone info first
        if dt_string.endswith('Z'):
            dt = datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
        elif '+' in dt_string or '-' in dt_string[16:]:
            dt = datetime.fromisoformat(dt_string)
        else:
            # No timezone info, assume UTC (common from flight-search-wrapper)
            dt = datetime.fromisoformat(dt_string)
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError as e:
        raise ValueError(f"Invalid datetime format: {dt_string}. Expected ISO 8601 format like '2026-04-08T15:05:00'")


def validate_flight_data(data: dict) -> None:
    """Validate flight data for creation/update"""
    required_fields = [
        'flight_number',
        'airline',
        'datetime_departure',
        'datetime_arrival',
        'trip_id',
        'cost'
    ]

    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    # Validate flight_number
    if not data['flight_number'] or len(data['flight_number']) > 50:
        raise ValueError("flight_number must be non-empty and max 50 characters")

    # Validate airline
    if not data['airline'] or len(data['airline']) > 100:
        raise ValueError("airline must be non-empty and max 100 characters")

    # Validate and convert datetime format
    try:
        # Store converted datetime in data dict for later use
        data['datetime_departure_parsed'] = parse_datetime(data['datetime_departure'])
        data['datetime_arrival_parsed'] = parse_datetime(data['datetime_arrival'])

        # Validate that arrival is after departure
        if data['datetime_arrival_parsed'] <= data['datetime_departure_parsed']:
            raise ValueError("datetime_arrival must be after datetime_departure")
    except ValueError as e:
        if "Invalid datetime format" in str(e):
            raise ValueError(str(e))
        raise ValueError("datetime_departure and datetime_arrival must be valid ISO 8601 format and arrival must be after departure")

    # Validate trip_id (should be UUID string)
    if not isinstance(data['trip_id'], str):
        raise ValueError("trip_id must be a UUID string")
    try:
        uuid.UUID(data['trip_id'])
    except ValueError:
        raise ValueError("trip_id must be a valid UUID string")

    # Validate cost
    try:
        cost = float(data['cost'])
        if cost < 0:
            raise ValueError("cost must be non-negative")
        if cost > 999999.99:  # Prevent NUMERIC(10,2) overflow
            raise ValueError("cost must be less than 1,000,000")
    except (ValueError, TypeError):
        raise ValueError("cost must be a valid number")

    # Validate external_link if provided
    if 'external_link' in data and data['external_link']:
        # More lenient validation for complex flight booking URLs
        external_link = data['external_link'].strip()

        # Basic format check - must start with http:// or https://
        if not external_link.startswith(('http://', 'https://')):
            raise ValueError("external_link must start with http:// or https://")

        # Increased max length for complex booking URLs (from 500 to 2000)
        if len(external_link) > 2000:
            raise ValueError("external_link is too long (max 2000 characters)")

        # Update data with cleaned URL
        data['external_link'] = external_link


def validate_flight_id(flight_id: str) -> None:
    """Validate flight_id (UUID string)"""
    if not isinstance(flight_id, str):
        raise ValueError("flight_id must be a UUID string")
    try:
        uuid.UUID(flight_id)
    except ValueError:
        raise ValueError("flight_id must be a valid UUID string")
