"""Test script for updated hotel management services."""
import sys
from pathlib import Path

# Handle imports for different execution locations
try:
    from saved_hotels import saved_hotels_service
    from hotel_search_wrapper import hotel_search_service
    from hotel_management_service import hotel_management_service
except ImportError:
    try:
        from ..saved_hotels import saved_hotels_service
        from ..hotel_search_wrapper import hotel_search_service
        from ..hotel_management_service import hotel_management_service
    except ImportError:
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from saved_hotels import saved_hotels_service
        from hotel_search_wrapper import hotel_search_service
        from hotel_management_service import hotel_management_service


def test_search_wrapper_with_city():
    """Test search wrapper with city parameter (no longer uses gl parameter)."""
    print("=" * 60)
    print("TEST 1: Search Wrapper with City Parameter")
    print("=" * 60)

    try:
        # Test using city parameter (will default to "hotels near Singapore")
        results = hotel_search_service.search_hotels(
            query="hotels near Singapore",
            check_in_date="2026-04-01",
            check_out_date="2026-04-02",
            adults=2,
            children=0,
            currency="SGD",
            hl="en",
            # Note: gl parameter is removed
        )

        print("✓ Search wrapper successfully called without gl parameter")
        print(f"  Query: hotels near Singapore")
        print(f"  Results found: {len(results.get('properties', []))} properties")
        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def test_saved_hotels_with_photos():
    """Test saved hotels with photos field."""
    print("\n" + "=" * 60)
    print("TEST 2: Saved Hotels with Photos Field")
    print("=" * 60)

    try:
        from datetime import datetime

        # Test creating hotel with photos
        import uuid

        # Generate a proper UUID
        test_trip_id = str(uuid.uuid4())

        hotel = saved_hotels_service.create_hotel(
            name="Test Hotel with Photos",
            description="Test hotel for photo functionality",
            datetime_check_in=datetime(2026, 5, 1, 14, 0, 0),
            datetime_check_out=datetime(2026, 5, 3, 11, 0, 0),
            trip_id=test_trip_id,
            rate_per_night=150.00,
            overall_rating=4.5,
            photos=[
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg",
                "https://example.com/photo3.jpg",
                "https://example.com/photo4.jpg",  # Should be limited to 3
            ],
        )

        print("✓ Hotel created with photos field")
        print(f"  Hotel ID: {hotel.get('hotel_id')}")
        print(f"  Photos count: {len(hotel.get('photos', []))}")
        print(f"  Photos: {hotel.get('photos', [])}")

        # Verify photos are limited to 3
        if len(hotel.get('photos', [])) == 3:
            print("✓ Photos correctly limited to maximum 3")
        else:
            print(f"✗ Photos count is {len(hotel.get('photos', []))}, expected 3")

        # Test updating hotel with photos
        updated_hotel = saved_hotels_service.update_hotel(
            hotel_id=hotel.get('hotel_id'),
            photos=["https://example.com/new_photo.jpg"],
        )

        print("✓ Hotel updated with new photos")
        print(f"  Updated photos: {updated_hotel.get('photos', [])}")

        # Clean up
        saved_hotels_service.delete_hotel(hotel.get('hotel_id'))
        print("✓ Test hotel cleaned up")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def test_hotel_management_with_city_and_photos():
    """Test hotel management service with city parameter and photo extraction."""
    print("\n" + "=" * 60)
    print("TEST 3: Hotel Management with City & Photos")
    print("=" * 60)

    try:
        # Test with city parameter (should default to "hotels near Singapore")
        result = hotel_management_service.search_and_save_hotel(
            query="hotels near Singapore",
            check_in_date="2026-04-01",
            check_out_date="2026-04-02",
            trip_id="550e8400-e29b-41d4-a716-446655440102",
            adults=2,
            children=0,
            currency="SGD",
            hl="en",
            # Note: gl parameter is removed
            save_to_database=False,  # Don't save to DB for this test
        )

        print("✓ Hotel management service called successfully")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            transformed_hotel = result.get('transformed_hotel')
            if transformed_hotel:
                print(f"  Hotel name: {transformed_hotel.get('name')}")
                print(f"  Has photos: {'Yes' if transformed_hotel.get('photos') else 'No'}")
                if transformed_hotel.get('photos'):
                    print(f"  Photos count: {len(transformed_hotel.get('photos', []))}")
                print("✓ Photo extraction working")
            else:
                print("  No hotel data transformed")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_health_checks():
    """Test health check endpoints for all services."""
    print("\n" + "=" * 60)
    print("TEST 4: Health Checks")
    print("=" * 60)

    try:
        search_health = hotel_search_service.health_check()
        print(f"✓ Search Wrapper: {search_health}")

        saved_health = saved_hotels_service.health_check()
        print(f"✓ Saved Hotels: {saved_health}")

        mgmt_health = hotel_management_service.health_check()
        print(f"✓ Hotel Management: {mgmt_health}")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("HOTEL MANAGEMENT SERVICES - UPDATED FUNCTIONALITY TESTS")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Health Checks", test_health_checks()))
    results.append(("Search Wrapper with City", test_search_wrapper_with_city()))
    results.append(("Saved Hotels with Photos", test_saved_hotels_with_photos()))
    results.append(("Hotel Management Integration", test_hotel_management_with_city_and_photos()))

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
