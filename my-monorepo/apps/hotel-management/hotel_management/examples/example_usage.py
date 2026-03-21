"""Example usage of Hotel Search Wrapper and Saved Hotels Service."""
from datetime import datetime
from hotel_search_wrapper import hotel_search_service
from saved_hotels import saved_hotels_service


# ============================================
# Configuration - Set to True to enable testing
# ============================================
TEST_HOTEL_SEARCH_WRAPPER = False  # Set to True to test search wrapper (uses API calls)
TEST_SAVED_HOTELS = True  # Set to True to test saved hotels CRUD operations


# ============================================
# Hotel Search Wrapper Examples
# ============================================

def example_basic_search():
    """Basic hotel search example."""
    results = hotel_search_service.search_hotels(
        query="Bali Resorts",
        check_in_date="2026-03-20",
        check_out_date="2026-03-21",
    )
    print("Basic Search Results:")
    print(results)
    return results


def example_search_with_filters():
    """Hotel search with sorting and rating filters example."""
    results = hotel_search_service.search_hotels(
        query="Marina Bay Sands",
        check_in_date="2026-04-01",
        check_out_date="2026-04-03",
        adults=2,
        children=1,
        currency="SGD",
        gl="sg",
        hl="en",
        sort_by=3,  # Lowest price
        rating=8,  # 4.0+ rating
    )
    print("\nSearch with Filters Results:")
    print(results)
    return results


def example_search_by_price():
    """Search hotels sorted by lowest price."""
    results = hotel_search_service.search_hotels(
        query="Singapore Hotels",
        check_in_date="2026-04-10",
        check_out_date="2026-04-12",
        sort_by=3,  # Lowest price
    )
    print("\nLowest Price Search Results:")
    print(results)
    return results


def example_search_by_rating():
    """Search hotels sorted by highest rating."""
    results = hotel_search_service.search_hotels(
        query="Singapore Hotels",
        check_in_date="2026-04-10",
        check_out_date="2026-04-12",
        sort_by=8,  # Highest rating
    )
    print("\nHighest Rating Search Results:")
    print(results)
    return results


def example_search_by_most_reviewed():
    """Search hotels sorted by most reviewed."""
    results = hotel_search_service.search_hotels(
        query="Singapore Hotels",
        check_in_date="2026-04-10",
        check_out_date="2026-04-12",
        sort_by=13,  # Most reviewed
    )
    print("\nMost Reviewed Search Results:")
    print(results)
    return results


def example_search_with_rating_filter():
    """Search hotels with 4.5+ rating filter."""
    results = hotel_search_service.search_hotels(
        query="Singapore Hotels",
        check_in_date="2026-04-10",
        check_out_date="2026-04-12",
        rating=9,  # 4.5+ rating
    )
    print("\nHigh Rating Filter Search Results:")
    print(results)
    return results


def example_hotel_search_health_check():
    """Check if the hotel search service is running."""
    status = hotel_search_service.health_check()
    print(f"\nHotel Search Health Check: {status}")
    return status


# ============================================
# Saved Hotels Service CRUD Examples
# ============================================

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
        total_cost=850.00,
        lat=1.2836,
        long=103.8607,
        amenities=["Free WiFi", "Pool", "Spa", "Restaurant", "Gym"],
    )
    print("\nCreated Hotel:")
    print(hotel)
    return hotel


def example_get_hotel(hotel_id: str):
    """Get a saved hotel by ID."""
    hotel = saved_hotels_service.get_hotel(hotel_id)
    print(f"\nRetrieved Hotel (ID: {hotel_id}):")
    print(hotel)
    return hotel


def example_get_hotels_by_trip(trip_id: str):
    """Get all saved hotels for a specific trip."""
    hotels = saved_hotels_service.get_hotels_by_trip(trip_id)
    print(f"\nHotels for Trip {trip_id}:")
    print(hotels)
    return hotels


def example_get_all_hotels():
    """Get all saved hotels."""
    hotels = saved_hotels_service.get_all_hotels()
    print("\nAll Saved Hotels:")
    print(hotels)
    return hotels


def example_update_hotel(hotel_id: str):
    """Update a saved hotel."""
    updated_hotel = saved_hotels_service.update_hotel(
        hotel_id=hotel_id,
        name="Marina Bay Sands - Updated",
        total_cost=900.00,
        overall_rating=4.8,
        amenities=["Free WiFi", "Pool", "Spa", "Restaurant", "Gym", "Concierge"],
    )
    print(f"\nUpdated Hotel (ID: {hotel_id}):")
    print(updated_hotel)
    return updated_hotel


def example_delete_hotel(hotel_id: str):
    """Delete a saved hotel."""
    success = saved_hotels_service.delete_hotel(hotel_id)
    print(f"\nDelete Hotel (ID: {hotel_id}): {'Success' if success else 'Failed'}")
    return success


def example_saved_hotels_health_check():
    """Check if the saved hotels service is running."""
    status = saved_hotels_service.health_check()
    print(f"\nSaved Hotels Health Check: {status}")
    return status


# ============================================
# Main Execution
# ============================================

if __name__ == "__main__":
    # Hotel Search Examples (Disabled by default to save API calls)
    if TEST_HOTEL_SEARCH_WRAPPER:
        print("=" * 50)
        print("HOTEL SEARCH WRAPPER EXAMPLES")
        print("=" * 50)
        example_hotel_search_health_check()
        example_basic_search()
        example_search_with_filters()
        example_search_by_price()
        example_search_by_rating()
        example_search_by_most_reviewed()
        example_search_with_rating_filter()

    # Saved Hotels CRUD Examples (Enabled by default)
    if TEST_SAVED_HOTELS:
        print("=" * 50)
        print("SAVED HOTELS SERVICE CRUD EXAMPLES")
        print("=" * 50)
        example_saved_hotels_health_check()

        # Create a hotel
        created_hotel = example_create_hotel()
        if created_hotel:
            hotel_id = created_hotel.get('hotel_id')

            # Read the hotel
            example_get_hotel(hotel_id)

            # Get hotels by trip
            trip_id = created_hotel.get('trip_id')
            example_get_hotels_by_trip(trip_id)

            # Get all hotels
            example_get_all_hotels()

            # Update the hotel
            example_update_hotel(hotel_id)

            # Optional: Delete the hotel (uncomment to test delete)
            # example_delete_hotel(hotel_id)
