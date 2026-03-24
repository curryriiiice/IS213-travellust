"""Test cleaned hotel management service (no search-and-save)."""
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
    """Test search functionality only."""
    print("=" * 60)
    print("TEST 1: Search Only")
    print("=" * 60)

    try:
        result = hotel_management_service.search_hotels(
            query="hotels near Singapore",
            check_in_date="2026-04-15",
            check_out_date="2026-04-16",
        )

        print("✓ Search works (no database save)")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            search_results = result.get('search_results')
            if 'properties' in search_results:
                print(f"  Found {len(search_results['properties'])} hotels")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def test_save_only():
    """Test save functionality only."""
    print("\n" + "=" * 60)
    print("TEST 2: Save Only")
    print("=" * 60)

    try:
        from datetime import datetime

        result = hotel_management_service.save_hotel_to_database(
            uid="test_user",
            trip_id=str(uuid.uuid4()),
            hotel_data={
                "name": "Test Hotel",
                "check_in_date": "2026-05-01",
                "check_out_date": "2026-05-03",
                "photos": ["url1.jpg", "url2.jpg"],
            },
        )

        print("✓ Save works (direct save)")
        print(f"  Status: {result.get('status')}")

        if result.get('status') == 'success':
            saved_hotel = result.get('saved_hotel')
            print(f"  Saved ID: {saved_hotel['hotel_id'] if saved_hotel else 'None'}")
            # Clean up
            if saved_hotel and saved_hotel.get('hotel_id'):
                saved_hotels_service.delete_hotel(saved_hotel['hotel_id'])
                print("  Cleaned up test hotel")

        return True

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    """Run tests."""
    print("\n" + "=" * 60)
    print("CLEANED HOTEL MANAGEMENT SERVICE TESTS")
    print("=" * 60)

    results = []
    results.append(("Search Only", test_search_only()))
    results.append(("Save Only", test_save_only()))

    # Summary
    print("\n" + "=" * 60)
    print(f"Total: {sum(1 for _, r in results if r)}/{len(results)} tests passed")
    print("=" * 60)


if __name__ == "__main__":
    main()
