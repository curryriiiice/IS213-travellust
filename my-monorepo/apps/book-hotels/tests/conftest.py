"""Pytest configuration for book-hotels microservice."""
import pytest


@pytest.fixture
def sample_trip():
    """Sample trip data for testing."""
    return {
        "trip_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user123",
        "destination": "Singapore",
        "hotel_ids": ["hotel1", "hotel2"],
    }


@pytest.fixture
def sample_hotel():
    """Sample hotel data for testing."""
    return {
        "hotel_id": "hotel1",
        "name": "Marina Bay Sands",
        "rate_per_night": 450.0,
        "datetime_check_in": "2026-04-15T14:00:00",
        "datetime_check_out": "2026-04-17T12:00:00",
    }
