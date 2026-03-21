"""Example usage of Hotel Management Composite Service."""
try:
    from hotel_management_service import hotel_management_service
except ImportError:
    from hotel_management.hotel_management_service import hotel_management_service


def example_search_and_save_hotel():
    """Search for a hotel and save the first result to the database."""
    print("=" * 60)
    print("HOTEL MANAGEMENT SERVICE - SEARCH AND SAVE HOTEL")
    print("=" * 60)

    result = hotel_management_service.search_and_save_hotel(
        query="Marina Bay Sands",
        check_in_date="2026-07-15",
        check_out_date="2026-07-17",
        trip_id="550e8400-e29b-41d4-a716-446655440000",  # Example trip UUID
        adults=2,
        children=0,
        currency="SGD",
        gl="sg",
        hl="en",
        sort_by=8,  # Highest rating
        rating=8,   # 4.0+ rating
        save_to_database=True,
    )

    print(f"\nStatus: {result['status']}")

    if result['status'] == 'success':
        print("\n" + "=" * 60)
        print("TRANSFORMED HOTEL DATA (Ready for Database)")
        print("=" * 60)
        transformed_hotel = result.get('transformed_hotel')
        if transformed_hotel:
            print(f"Name: {transformed_hotel.get('name')}")
            print(f"Description: {transformed_hotel.get('description', 'N/A')}")
            print(f"Check-in: {transformed_hotel.get('datetime_check_in')}")
            print(f"Check-out: {transformed_hotel.get('datetime_check_out')}")
            print(f"Rating: {transformed_hotel.get('overall_rating', 'N/A')}")
            print(f"Total Cost: ${transformed_hotel.get('rate_per_night', 'N/A')}")
            print(f"Location: ({transformed_hotel.get('lat', 'N/A')}, {transformed_hotel.get('long', 'N/A')})")
            print(f"Amenities: {transformed_hotel.get('amenities', [])}")

        print("\n" + "=" * 60)
        print("SAVED HOTEL DATA (From Database)")
        print("=" * 60)
        saved_hotel = result.get('saved_hotel')
        if saved_hotel:
            print(f"Hotel ID: {saved_hotel.get('hotel_id')}")
            print(f"Name: {saved_hotel.get('name')}")
            print(f"Trip ID: {saved_hotel.get('trip_id')}")
            print(f"Created At: {saved_hotel.get('created_at')}")

    elif result['status'] == 'error':
        print(f"\nError: {result.get('error')}")

    return result


def example_search_without_saving():
    """Search for hotels without saving to the database."""
    print("\n" + "=" * 60)
    print("HOTEL MANAGEMENT SERVICE - SEARCH ONLY (No Save)")
    print("=" * 60)

    result = hotel_management_service.search_and_save_hotel(
        query="Singapore Luxury Hotels",
        check_in_date="2026-08-01",
        check_out_date="2026-08-03",
        trip_id="550e8400-e29b-41d4-a716-446655440000",  # Example trip UUID
        adults=2,
        children=1,
        currency="SGD",
        gl="sg",
        hl="en",
        sort_by=3,  # Lowest price
        save_to_database=False,  # Don't save to database
    )

    print(f"\nStatus: {result['status']}")

    if result['status'] == 'success':
        print("\n" + "=" * 60)
        print("SEARCH RESULTS (First Hotel Only)")
        print("=" * 60)
        search_results = result.get('search_results')

        # Display basic search info
        search_info = search_results.get('search_information', {})
        print(f"Total Results: {search_info.get('total_results', 'N/A')}")
        print(f"Search Engine: {search_results.get('search_parameters', {}).get('engine', 'N/A')}")

        # Display transformed hotel data
        transformed_hotel = result.get('transformed_hotel')
        if transformed_hotel:
            print(f"\nFirst Hotel Found:")
            print(f"  Name: {transformed_hotel.get('name')}")
            print(f"  Rating: {transformed_hotel.get('overall_rating', 'N/A')}")
            print(f"  Cost: ${transformed_hotel.get('rate_per_night', 'N/A')}")
            print(f"  Amenities: {len(transformed_hotel.get('amenities', []))} found")

        print("\nNote: Hotel was NOT saved to database (save_to_database=False)")

    elif result['status'] == 'error':
        print(f"\nError: {result.get('error')}")

    return result


def example_health_check():
    """Check if the hotel management service is running."""
    print("\n" + "=" * 60)
    print("HEALTH CHECK")
    print("=" * 60)
    status = hotel_management_service.health_check()
    print(f"Status: {status}")
    return status


def example_basic_search():
    """Basic hotel search with minimal parameters."""
    print("\n" + "=" * 60)
    print("BASIC SEARCH")
    print("=" * 60)

    result = hotel_management_service.search_and_save_hotel(
        query="Bali Resorts",
        check_in_date="2026-09-15",
        check_out_date="2026-09-17",
        trip_id="550e8400-e29b-41d4-a716-446655440000",
    )

    print(f"\nStatus: {result['status']}")
    if result['status'] == 'success':
        transformed_hotel = result.get('transformed_hotel')
        if transformed_hotel:
            print(f"Found: {transformed_hotel.get('name')}")
            print(f"Rating: {transformed_hotel.get('overall_rating', 'N/A')}")
            print(f"Cost: ${transformed_hotel.get('rate_per_night', 'N/A')}")
            saved = result.get('saved_hotel')
            print(f"Saved to DB: {'Yes' if saved else 'No'}")

    return result


def main():
    """Run all hotel management service examples."""
    print("=" * 60)
    print("HOTEL MANAGEMENT COMPOSITE SERVICE EXAMPLES")
    print("=" * 60)

    # Health check
    example_health_check()

    # Search without saving (saves API calls)
    example_search_without_saving()

    # Basic search
    example_basic_search()

    # Search and save to database
    example_search_and_save_hotel()

    print("\n" + "=" * 60)
    print("EXAMPLES COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
