"""
Test script for FlightAPI integration
"""
import os
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def test_flightapi_authentication():
    """Test that FlightAPI is properly configured"""

    print("🧪 Testing FlightAPI Configuration...")
    print("=" * 50)

    try:
        from src.config import Config

        # Load configuration
        config = Config()

        # Check if API key is available
        if not config.FLIGHTAPI_KEY:
            print("❌ FlightAPI key not found in environment variables")
            return False

        print(f"✅ FLIGHTAPI_KEY found: {config.FLIGHTAPI_KEY[:10]}...")
        print(f"✅ FLIGHTAPI_BASE_URL: {config.FLIGHTAPI_BASE_URL}")
        print(f"✅ USD to SGD exchange rate: {config.USD_TO_SGD_RATE}")

        # Create FlightAPI client
        from src.flightapi_client import FlightAPIClient
        flightapi_client = FlightAPIClient(config)
        print("✅ FlightAPI client created successfully")

        print("\n✅ All configuration checks passed!")
        return True

    except Exception as e:
        print(f"❌ Error during configuration test: {e}")
        return False

def test_flight_search_service():
    """Test the Flight Search Service"""

    print("\n" + "=" * 50)
    print("🧪 Testing Flight Search Service...")
    print("=" * 50)

    try:
        from src.services.flight_search_service import FlightSearchService

        # Create service
        service = FlightSearchService()
        print("✅ Flight Search Service created successfully")

        # Verify it's using FlightAPI client
        if hasattr(service, 'client'):
            from src.flightapi_client import FlightAPIClient
            if isinstance(service.client, FlightAPIClient):
                print("✅ Service is using FlightAPI client")
            else:
                print("❌ Service is not using FlightAPI client")
                return False
        else:
            print("❌ Service missing client attribute")
            return False

        return True

    except Exception as e:
        print(f"❌ Error during service test: {e}")
        return False

def test_flight_model():
    """Test the Flight model with price fields"""

    print("\n" + "=" * 50)
    print("🧪 Testing Flight Model with Price...")
    print("=" * 50)

    try:
        from src.models import Flight

        # Create a flight with price
        flight = Flight(
            flight_number='SQ123',
            airline='Singapore Airlines',
            datetime_departure='2026-03-20T10:00:00Z',
            datetime_arrival='2026-03-20T14:00:00Z',
            price_usd=2747.36,
            price_sgd=3681.46,
            currency='USD',
            external_link='https://api.flightapi.io/roundtrip/123'
        )

        print("✅ Flight object created with price fields")
        print(f"   Price USD: ${flight.price_usd}")
        print(f"   Price SGD: ${flight.price_sgd}")
        print(f"   Currency: {flight.currency}")

        # Test to_dict conversion
        flight_dict = flight.to_dict()
        assert 'price_usd' in flight_dict
        assert 'price_sgd' in flight_dict
        assert 'currency' in flight_dict
        print("✅ Flight model to_dict() includes price fields")

        return True

    except Exception as e:
        print(f"❌ Error during model test: {e}")
        return False

def test_currency_conversion():
    """Test currency conversion function"""

    print("\n" + "=" * 50)
    print("🧪 Testing Currency Conversion...")
    print("=" * 50)

    try:
        from src.flightapi_client import convert_usd_to_sgd

        # Test basic conversion
        usd_amount = 100.0
        sgd_amount = convert_usd_to_sgd(usd_amount)
        expected_sgd = 134.0  # 100 * 1.34

        assert abs(sgd_amount - expected_sgd) < 0.01, f"Expected {expected_sgd}, got {sgd_amount}"
        print(f"✅ ${usd_amount} USD = ${sgd_amount} SGD")

        # Test with the rate from the example
        example_usd = 2747.36
        example_sgd = convert_usd_to_sgd(example_usd)
        expected_example_sgd = 2747.36 * 1.34  # 3681.4624

        assert abs(example_sgd - expected_example_sgd) < 0.01, f"Expected {expected_example_sgd}, got {example_sgd}"
        print(f"✅ ${example_usd} USD = ${example_sgd} SGD")

        # Test with custom exchange rate
        custom_rate = 1.5
        custom_sgd = convert_usd_to_sgd(100.0, custom_rate)
        assert abs(custom_sgd - 150.0) < 0.01, f"Expected 150.0, got {custom_sgd}"
        print(f"✅ Custom rate test: ${100.0} USD = ${custom_sgd} SGD (rate: {custom_rate})")

        return True

    except Exception as e:
        print(f"❌ Error during currency conversion test: {e}")
        return False

def test_api_endpoint():
    """Test the Flask API endpoint"""

    print("\n" + "=" * 50)
    print("🧪 Testing Flask API Endpoint...")
    print("=" * 50)

    try:
        from src.app import create_app

        # Create app
        app = create_app()
        print("✅ Flask app created successfully")

        # Test client
        with app.test_client() as client:
            # Test health endpoint
            response = client.get('/api/health')
            if response.status_code == 200:
                print("✅ Health endpoint working")
            else:
                print(f"❌ Health endpoint returned {response.status_code}")
                return False

        return True

    except Exception as e:
        print(f"❌ Error during API test: {e}")
        return False

def main():
    print("🚀 FlightAPI Flight Search Wrapper - Test Suite")
    print("=" * 50)

    results = {
        'FlightAPI Configuration': test_flightapi_authentication(),
        'Flight Search Service': test_flight_search_service(),
        'Flight Model with Price': test_flight_model(),
        'Currency Conversion': test_currency_conversion(),
        'API Endpoint': test_api_endpoint()
    }

    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")

    all_passed = all(results.values())

    if all_passed:
        print("\n🎉 All tests passed! Your FlightAPI integration is ready.")
        print("\nNext steps:")
        print("1. Test with actual API calls using:")
        print("   curl -X POST http://localhost:5001/api/flights/search \\")
        print("     -H 'Content-Type: application/json' \\")
        print("     -d '{\"origin\": \"SIN\", \"destination\": \"HKG\", \"datetime_departure\": \"2026-04-01T10:00:00Z\", \"datetime_arrival\": \"2026-04-08T10:00:00Z\"}'")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the configuration.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
