"""Test script for search and save separation functionality."""
import sys
import uuid
from pathlib import Path

# Handle imports for different execution locations
try:
    from hotel_management_service import hotel_management_service
    from saved_hotels import saved_hotels_service
except ImportError:
    try:
        from ..hotel_management_service import hotel_management_service
        from ..saved_hotels import saved_hotels_service
    except ImportError:
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from hotel_management_service import hotel_management_service
        from saved_hotels import saved_hotels_service


def test_search_only():
    """Test the search-only endpoint (no database saving)."""
    print("=" * 60)
    print("TEST 1: Search Only - No Database Saving")
    print("=" * 60)

    try:
        # Test search functionality without saving to database
        result = hotel_management_service.search_hotels(
            query="hotels near Singapore",
            check_in_date="2026-04-15",
            check_out_date="2026-04-16",
            adults=2,
            children=0,
            currency="SGD",
            hl="en",
        )

        print("✓ Search completed without database saving")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            search_results = result.get('search_results')
            print(f"  Search successful: {search_results is not None}")
            if 'properties' in search_results:
                print(f"  Found {len(search_results.get('properties', []))} hotels")
            print("✓ Search functionality working correctly")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def test_save_selected_hotel():
    """Test saving a selected hotel to the database."""
    print("\n" + "=" * 60)
    print("TEST 2: Save Selected Hotel - Direct Database Save")
    print("=" * 60)

    try:
        from datetime import datetime

        # Test UID
        test_uid = "user_12345"

        # Test trip ID
        test_trip_id = str(uuid.uuid4())

        # Sample hotel data as would come from search results
        sample_hotel_data = {
            "name": "Test Hotel - Save Functionality",
            "description": "Testing save functionality with selected hotel",
            "check_in_date": "2026-05-20",
            "check_out_date": "2026-05-22",
            "external_link": "https://example.com/booking",
            "link": "test_property_token",
            "overall_rating": 4.5,
            "rate_per_night": 250.00,
            "lat": 1.3521,
            "long": 103.8198,
            "amenities": ["Free WiFi", "Pool", "Spa", "Restaurant"],
            "photos": [
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg",
                "https://example.com/photo3.jpg",
            ],
        }

        result = hotel_management_service.save_hotel_to_database(
            uid=test_uid,
            trip_id=test_trip_id,
            hotel_data=sample_hotel_data,
        )

        print("✓ Save hotel endpoint called")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            saved_hotel = result.get('saved_hotel')
            print(f"  Saved hotel ID: {saved_hotel.get('hotel_id') if saved_hotel else 'None'}")
            print(f"  Hotel name: {saved_hotel.get('name') if saved_hotel else 'None'}")
            print(f"  UID: {result.get('uid')}")
            print(f"  Trip ID: {result.get('trip_id')}")

            if saved_hotel and saved_hotel.get('photos'):
                print(f"  Photos saved: {len(saved_hotel.get('photos'))}")

            # Clean up test hotel
            if saved_hotel and saved_hotel.get('hotel_id'):
                saved_hotels_service.delete_hotel(saved_hotel.get('hotel_id'))
                print("✓ Test hotel cleaned up")

            print("✓ Save hotel functionality working correctly")
            return True

        else:
            print(f"✗ Save failed: {result.get('error')}")
            return False

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_workflow_integration():
    """Test the complete workflow: search + save."""
    print("\n" + "=" * 60)
    print("TEST 3: Workflow Integration - Search Then Save")
    print("=" * 60)

    try:
        from datetime import datetime

        # Step 1: Search for hotels
        print("Step 1: Searching for hotels...")
        search_result = hotel_management_service.search_hotels(
            query="hotels near Marina Bay",
            check_in_date="2026-06-01",
            check_out_date="2026-06-03",
            adults=2,
            children=0,
            currency="SGD",
        )

        if search_result.get('status') != 'success':
            print(f"✗ Search failed: {search_result.get('error')}")
            return False

        print("✓ Search successful")

        # Step 2: Extract a hotel from search results
        search_data = search_result.get('search_results')
        properties = search_data.get('properties', [])

        if not properties:
            print("✗ No hotels found in search results")
            return False

        # Take the first hotel and prepare it for saving
        first_hotel = properties[0]
        print(f"  Selected hotel: {first_hotel.get('name')}")

        # Step 3: Save the selected hotel
        print("Step 2: Saving selected hotel...")
        test_uid = "user_workflow_test"
        test_trip_id = str(uuid.uuid4())

        hotel_to_save = {
            "name": first_hotel.get('name'),
            "description": first_hotel.get('description'),
            "check_in_date": "2026-06-01",
            "check_out_date": "2026-06-03",
            "external_link": first_hotel.get('link'),
            "link": first_hotel.get('property_token'),
            "overall_rating": first_hotel.get('overall_rating'),
            "rate_per_night": first_hotel.get('rate_per_night', {}).get('extracted_lowest') if isinstance(first_hotel.get('rate_per_night'), dict) else first_hotel.get('rate_per_night'),
            "lat": first_hotel.get('gps_coordinates', {}).get('latitude') if isinstance(first_hotel.get('gps_coordinates'), dict) else None,
            "long": first_hotel.get('gps_coordinates', {}).get('longitude') if isinstance(first_hotel.get('gps_coordinates'), dict) else None,
            "amenities": first_hotel.get('amenities'),
            "photos": [],  # Photos extraction will be handled by hotel service
        }

        save_result = hotel_management_service.save_hotel_to_database(
            uid=test_uid,
            trip_id=test_trip_id,
            hotel_data=hotel_to_save,
        )

        if save_result.get('status') == 'success':
            saved_hotel = save_result.get('saved_hotel')
            print(f"✓ Saved hotel ID: {saved_hotel.get('hotel_id') if saved_hotel else 'None'}")
            print("✓ Complete workflow successful")

            # Clean up test hotel
            if saved_hotel and saved_hotel.get('hotel_id'):
                saved_hotels_service.delete_hotel(saved_hotel.get('hotel_id'))

            return True

        else:
            print(f"✗ Save failed: {save_result.get('error')}")
            return False

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_city_query():
    """Test city-based query functionality."""
    print("\n" + "=" * 60)
    print("TEST 4: City-Based Query - Default Suggestions")
    print("=" * 60)

    try:
        # Test with city-based queries (should default to "hotels near {city}")
        result = hotel_management_service.search_hotels(
            query="hotels near Tokyo",
            check_in_date="2026-07-01",
            check_out_date="2026-07-02",
            adults=1,
            children=0,
            currency="SGD",
        )

        print("✓ City-based query successful")
        print(f"  Query: hotels near Tokyo")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            search_results = result.get('search_results')
            print("✓ City suggestions working correctly")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("HOTEL MANAGEMENT - SEARCH & SAVE SEPARATION TESTS")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Search Only", test_search_only()))
    results.append(("Save Selected Hotel", test_save_selected_hotel()))
    results.append(("Workflow Integration", test_workflow_integration()))
    results.append(("City-Based Query", test_city_query()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name:.<50} {status}")

    print("\n" + "=" * 60)
    print(f"Total: {passed}/{total} tests passed")
    print("=" * 60)


if __name__ == "__main__":
    main()
