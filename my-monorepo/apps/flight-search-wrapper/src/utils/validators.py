from datetime import datetime


def validate_flight_search_params(data: dict) -> None:
    """Validate flight search parameters"""
    required_fields = ['origin', 'destination', 'datetime_departure', 'datetime_arrival']

    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    # Validate origin and destination (should be IATA airport codes - 3 letters)
    origin = data.get('origin', '').upper()
    destination = data.get('destination', '').upper()

    if not origin or len(origin) != 3 or not origin.isalpha():
        raise ValueError("origin must be a 3-letter IATA airport code")

    if not destination or len(destination) != 3 or not destination.isalpha():
        raise ValueError("destination must be a 3-letter IATA airport code")

    # Validate datetime format
    try:
        datetime.fromisoformat(data['datetime_departure'].replace('Z', '+00:00'))
        datetime.fromisoformat(data['datetime_arrival'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        raise ValueError("datetime_departure and datetime_arrival must be valid ISO 8601 format")
