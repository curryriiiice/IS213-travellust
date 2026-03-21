"""Example usage of Saved Hotels Service (CRUD operations only)."""
from datetime import datetime
from saved_hotels import saved_hotels_service


# ============================================
# Saved Hotels Service CRUD Examples
# ============================================

def example_saved_hotels_health_check():
    """Check if the saved hotels service is running."""
    status = saved_hotels_service.health_check()
    print(f"\nSaved Hotels Health Check: {status}")
    return status


def example_create_hotel():
    """Create a new saved hotel entry."""
    check_in = datetime(2026, 5, 15, 14, 0, 0)
    check_out = datetime(2026, 5, 17, 11, 0, 0)
    trip_id = "550e8400-e29b-41d4-a716-446655440000"  # Example trip UUID

    hotel = saved_hotels_service.create_hotel(
        name="Marina Bay Sands",
        description="Luxury hotel with infinity pool and city views",
        datetime_check_in=check_in,
        datetime_check_out=check_out,
        trip_id=trip_id,
        external_link="https://example.com/booking",
        link="/hotels/marina-bay-sands",
        overall_rating=4.5,
        rate_per_night=425.00,
        lat=1.2836,
        long=103.8607,
        amenities=["Free WiFi", "Pool", "Spa", "Restaurant", "Gym"],
    )
    print("\n" + "=" * 50)
    print("Created Hotel:")
    print("=" * 50)
    print(hotel)
    return hotel


def example_get_hotel(hotel_id: str):
    """Get a saved hotel by ID."""
    hotel = saved_hotels_service.get_hotel(hotel_id)
    print(f"\n" + "=" * 50)
    print(f"Retrieved Hotel (ID: {hotel_id}):")
    print("=" * 50)
    print(hotel)
    return hotel


def example_get_hotels_by_trip(trip_id: str):
    """Get all saved hotels for a specific trip."""
    hotels = saved_hotels_service.get_hotels_by_trip(trip_id)
    print(f"\n" + "=" * 50)
    print(f"Hotels for Trip {trip_id}:")
    print("=" * 50)
    for i, hotel in enumerate(hotels, 1):
        print(f"\nHotel {i}:")
        print(f"  Name: {hotel.get('name')}")
        print(f"  Check-in: {hotel.get('datetime_check_in')}")
        print(f"  Check-out: {hotel.get('datetime_check_out')}")
        print(f"  Rating: {hotel.get('overall_rating')}")
        print(f"  Cost: ${hotel.get('rate_per_night')}")
    return hotels


def example_get_all_hotels():
    """Get all saved hotels."""
    hotels = saved_hotels_service.get_all_hotels()
    print("\n" + "=" * 50)
    print("All Saved Hotels:")
    print("=" * 50)
    for i, hotel in enumerate(hotels, 1):
        print(f"\nHotel {i}:")
        print(f"  Name: {hotel.get('name')}")
        print(f"  Check-in: {hotel.get('datetime_check_in')}")
        print(f"  Check-out: {hotel.get('datetime_check_out')}")
        print(f"  Rating: {hotel.get('overall_rating')}")
        print(f"  Cost: ${hotel.get('rate_per_night')}")
    return hotels


def example_update_hotel(hotel_id: str):
    """Update a saved hotel."""
    updated_hotel = saved_hotels_service.update_hotel(
        hotel_id=hotel_id,
        name="Marina Bay Sands - Updated",
        rate_per_night=900.00,
        overall_rating=4.8,
        amenities=["Free WiFi", "Pool", "Spa", "Restaurant", "Gym", "Concierge"],
    )
    print(f"\n" + "=" * 50)
    print(f"Updated Hotel (ID: {hotel_id}):")
    print("=" * 50)
    print(updated_hotel)
    return updated_hotel


def example_delete_hotel(hotel_id: str):
    """Delete a saved hotel."""
    success = saved_hotels_service.delete_hotel(hotel_id)
    print(f"\n" + "=" * 50)
    print(f"Delete Hotel (ID: {hotel_id}): {'Success' if success else 'Failed'}")
    print("=" * 50)
    return success


def example_create_multiple_hotels():
    """Create multiple hotel entries for testing."""
    trip_id = "550e8400-e29b-41d4-a716-446655440000"

    hotels_to_create = [
        {
            "name": "Marina Bay Sands",
            "description": "Luxury hotel with infinity pool",
            "check_in": datetime(2026, 5, 15, 14, 0, 0),
            "check_out": datetime(2026, 5, 17, 11, 0, 0),
            "rate_per_night": 850.00,
            "overall_rating": 4.5,
            "lat": 1.2836,
            "long": 103.8607,
            "amenities": ["Free WiFi", "Pool", "Spa", "Restaurant", "Gym"],
        },
        {
            "name": "Raffles Hotel",
            "description": "Historic luxury hotel",
            "check_in": datetime(2026, 5, 20, 15, 0, 0),
            "check_out": datetime(2026, 5, 22, 12, 0, 0),
            "rate_per_night": 1200.00,
            "overall_rating": 4.9,
            "lat": 1.2959,
            "long": 103.8517,
            "amenities": ["Free WiFi", "Pool", "Restaurant", "Bar", "Garden"],
        },
        {
            "name": "The Fullerton Bay Hotel",
            "description": "Waterfront luxury hotel",
            "check_in": datetime(2026, 6, 1, 14, 0, 0),
            "check_out": datetime(2026, 6, 3, 11, 0, 0),
            "rate_per_night": 1500.00,
            "overall_rating": 4.7,
            "lat": 1.2857,
            "long": 103.8525,
            "amenities": ["Free WiFi", "Pool", "Spa", "Restaurant", "Gym", "Concierge"],
        },
    ]

    print("\n" + "=" * 50)
    print("Creating Multiple Hotels:")
    print("=" * 50)

    created_hotels = []
    for hotel_data in hotels_to_create:
        hotel = saved_hotels_service.create_hotel(
            name=hotel_data["name"],
            description=hotel_data["description"],
            datetime_check_in=hotel_data["check_in"],
            datetime_check_out=hotel_data["check_out"],
            trip_id=trip_id,
            rate_per_night=hotel_data["rate_per_night"],
            overall_rating=hotel_data["overall_rating"],
            lat=hotel_data["lat"],
            long=hotel_data["long"],
            amenities=hotel_data["amenities"],
        )
        print(f"✓ Created: {hotel_data['name']}")
        created_hotels.append(hotel)

    print(f"\nSuccessfully created {len(created_hotels)} hotels")
    return created_hotels


# ============================================
# Main Execution - Saved Hotels CRUD Tests Only
# ============================================

if __name__ == "__main__":
    print("=" * 50)
    print("SAVED HOTELS SERVICE CRUD EXAMPLES")
    print("=" * 50)

    # Health check
    example_saved_hotels_health_check()

    # Create multiple hotels for testing
    hotels = example_create_multiple_hotels()

    if hotels:
        # Get the first hotel ID for individual operations
        first_hotel_id = hotels[0].get('hotel_id')
        trip_id = hotels[0].get('trip_id')

        # Read individual hotel
        example_get_hotel(first_hotel_id)

        # Get hotels by trip
        example_get_hotels_by_trip(trip_id)

        # Get all hotels
        example_get_all_hotels()

        # Update a hotel
        example_update_hotel(first_hotel_id)

        # Optional: Delete the hotel (uncomment to test delete)
        # example_delete_hotel(first_hotel_id)

        print("\n" + "=" * 50)
        print("TESTING COMPLETE")
        print("=" * 50)
