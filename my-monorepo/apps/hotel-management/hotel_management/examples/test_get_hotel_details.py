"""Test script for get hotel details by ID endpoint."""
import sys
import uuid
from pathlib import Path
from datetime import datetime

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


def test_get_hotel_details():
    """Test getting hotel details by ID."""
    print("=" * 60)
    print("TEST: Get Hotel Details by ID")
    print("=" * 60)

    try:
        # Step 1: Create a test hotel
        print("Step 1: Creating test hotel...")
        test_trip_id = str(uuid.uuid4())
        created_hotel = saved_hotels_service.create_hotel(
            name="Test Hotel - Get Details",
            description="Testing get hotel details functionality",
            datetime_check_in=datetime(2026, 6, 1, 14, 0, 0),
            datetime_check_out=datetime(2026, 6, 3, 11, 0, 0),
            trip_id=test_trip_id,
            rate_per_night=200.00,
            overall_rating=4.5,
            photos=["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
        )

        print(f"✓ Created test hotel: {created_hotel.get('hotel_id')}")

        # Step 2: Get hotel details by ID
        print("Step 2: Getting hotel details by ID...")
        result = hotel_management_service.get_hotel_by_id(created_hotel.get('hotel_id'))

        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            retrieved_hotel = result.get('hotel')
            print(f"  Hotel name: {retrieved_hotel.get('name')}")
            print(f"  Description: {retrieved_hotel.get('description')}")
            print(f"  Rate per night: ${retrieved_hotel.get('rate_per_night')}")
            print(f"  Rating: {retrieved_hotel.get('overall_rating')}")
            print(f"  Photos count: {len(retrieved_hotel.get('photos', []))}")

            # Verify all fields are present
            expected_fields = ['name', 'description', 'rate_per_night', 'overall_rating', 'photos']
            present_fields = [field for field in expected_fields if field in retrieved_hotel]

            print(f"  Expected fields present: {len(present_fields)}/{len(expected_fields)}")

            if len(present_fields) == len(expected_fields):
                print("✓ All expected fields present")
                test_passed = True
            else:
                missing = set(expected_fields) - set(present_fields)
                print(f"  Missing fields: {missing}")
                test_passed = False

        else:
            print(f"  Error: {result.get('error')}")
            test_passed = False

        # Step 3: Clean up
        print("Step 3: Cleaning up test hotel...")
        if created_hotel and created_hotel.get('hotel_id'):
            saved_hotels_service.delete_hotel(created_hotel.get('hotel_id'))
            print("✓ Test hotel cleaned up")

        return test_passed

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_get_nonexistent_hotel():
    """Test getting hotel details for non-existent ID."""
    print("\n" + "=" * 60)
    print("TEST: Get Non-Existent Hotel Details")
    print("=" * 60)

    try:
        fake_hotel_id = str(uuid.uuid4())
        print(f"Using fake hotel ID: {fake_hotel_id}")

        result = hotel_management_service.get_hotel_by_id(fake_hotel_id)

        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'error':
            print(f"  Error message: {result.get('error')}")
            print("✓ Correctly handled non-existent hotel")
            return True

        if result.get('hotel'):
            print("✗ Unexpected: Hotel found for fake ID")
            return False

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("HOTEL MANAGEMENT - GET HOTEL DETAILS TESTS")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Get Hotel Details", test_get_hotel_details()))
    results.append(("Get Non-Existent Hotel", test_get_nonexistent_hotel()))

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
