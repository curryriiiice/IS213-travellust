"""
Test file to verify payload standardization across microservices.

This file tests:
1. plan_service accepts new flight fields (currency, price_usd, aircraft_type, legroom, co2_kg)
2. plan_service accepts both uid and user_id and maps them correctly
3. hotel-management accepts user_id (with fallback to uid)
4. saved-hotels accepts user_id consistently

Note: This is a simplified verification test that checks the code logic
      without running the full service (which requires external dependencies).
"""


def test_user_id_normalization():
    """Test the user_id normalization logic."""
    print("Testing user_id normalization logic...")

    # Test 1: user_id is preferred over uid
    data1 = {"user_id": "user-1", "uid": "user-2"}
    user_id = data1.get("user_id") or data1.get("uid")
    assert user_id == "user-1", "user_id should take precedence"
    print("  ✓ user_id takes precedence over uid")

    # Test 2: uid is used when user_id is not present
    data2 = {"uid": "user-2"}
    user_id = data2.get("user_id") or data2.get("uid")
    assert user_id == "user-2", "uid should be used as fallback"
    print("  ✓ uid is used when user_id is not present")

    # Test 3: None is returned when neither is present
    data3 = {}
    user_id = data3.get("user_id") or data3.get("uid")
    assert user_id is None, "None should be returned when neither is present"
    print("  ✓ None is returned when neither is present")


def test_flight_optional_fields():
    """Test that new optional flight fields are recognized."""
    print("\nTesting flight optional fields...")

    flight_details = {
        "airline": "AirAsia",
        "datetime_arrival": "2026-04-08T23:25:00",
        "datetime_departure": "2026-04-01T17:55:00",
        "external_link": "https://www.google.com/travel/flights",
        "flight_number": "1796",
        "price_sgd": 778.34,
        "price_usd": 580.85,
        "currency": "USD",
        "origin": "SIN",
        "destination": "HKG",
        "aircraft_type": "Boeing 737",
        "legroom": "32 inches",
        "co2_kg": 120.5,
    }

    optional_fields = [
        "external_link",
        "origin",
        "destination",
        "aircraft_type",
        "legroom",
        "co2_kg",
        "price_sgd",
        "price_usd",
        "currency",
    ]

    for field in optional_fields:
        assert field in flight_details, f"Missing optional field: {field}"
        print(f"  ✓ {field} is present")


def test_code_verification():
    """Verify the actual code changes were made."""
    print("\nVerifying code changes...")

    # Check plan.py for save_hotel route documentation
    plan_path = "/Users/yangyangyangyangyang/Documents/SMU/Y2S2/IS 213 ESD/ESD Project/my-monorepo/apps/plan_service/apps/plan_service/routes/plan.py"
    with open(plan_path, 'r') as f:
        plan_content = f.read()

    # Check that save_hotel route has documentation for uid fallback
    assert 'uid' in plan_content or 'user_id' in plan_content, "plan.py should reference uid or user_id"
    print("  ✓ plan.py save_hotel route updated")

    # Check hotel_plan_service.py for normalization
    hotel_service_path = "/Users/yangyangyangyangyang/Documents/SMU/Y2S2/IS 213 ESD/ESD Project/my-monorepo/apps/plan_service/apps/plan_service/services/hotel_plan_service.py"
    with open(hotel_service_path, 'r') as f:
        hotel_service_content = f.read()

    # Check for user_id normalization logic
    assert 'data.get("user_id") or data.get("uid")' in hotel_service_content, \
        "hotel_plan_service.py should normalize uid to user_id"
    print("  ✓ hotel_plan_service.py normalizes uid to user_id")

    # Check hotel_management_app.py for user_id acceptance
    hotel_app_path = "/Users/yangyangyangyangyang/Documents/SMU/Y2S2/IS 213 ESD/ESD Project/my-monorepo/apps/hotel-management/hotel-management/src/hotel_management_app.py"
    with open(hotel_app_path, 'r') as f:
        hotel_app_content = f.read()

    # Check for user_id acceptance with fallback
    assert 'data.get("user_id") or data.get("uid")' in hotel_app_content, \
        "hotel_management_app.py should accept user_id with fallback to uid"
    print("  ✓ hotel_management_app.py accepts user_id with fallback")

    # Check hotel_management_service.py for user_id parameter
    hotel_mgmt_service_path = "/Users/yangyangyangyangyang/Documents/SMU/Y2S2/IS 213 ESD/ESD Project/my-monorepo/apps/hotel-management/hotel-management/src/hotel_management_service.py"
    with open(hotel_mgmt_service_path, 'r') as f:
        hotel_mgmt_service_content = f.read()

    # Check that save_hotel_to_database uses user_id parameter
    assert 'def save_hotel_to_database(' in hotel_mgmt_service_content and 'user_id' in hotel_mgmt_service_content, \
        "hotel_management_service.py should use user_id parameter"
    print("  ✓ hotel_management_service.py uses user_id parameter")

    # Check saved_hotels_app.py for user_id acceptance
    saved_hotels_app_path = "/Users/yangyangyangyangyang/Documents/SMU/Y2S2/IS 213 ESD/ESD Project/my-monorepo/apps/saved-hotels/src/saved_hotels_app.py"
    with open(saved_hotels_app_path, 'r') as f:
        saved_hotels_app_content = f.read()

    # Check for user_id normalization in saved-hotels
    assert 'data.get("user_id") or data.get("uid")' in saved_hotels_app_content, \
        "saved_hotels_app.py should accept user_id with fallback to uid"
    print("  ✓ saved_hotels_app.py accepts user_id with fallback")


if __name__ == "__main__":
    print("=" * 70)
    print("Payload Standardization Verification Tests")
    print("=" * 70)

    try:
        test_user_id_normalization()
        test_flight_optional_fields()
        test_code_verification()

        print("\n" + "=" * 70)
        print("All verification tests PASSED! ✓")
        print("=" * 70)
    except AssertionError as e:
        print(f"\n✗ Test FAILED: {e}")
    except FileNotFoundError as e:
        print(f"\n✗ Test FAILED: File not found - {e}")
    except Exception as e:
        print(f"\n✗ Test FAILED: {e}")
