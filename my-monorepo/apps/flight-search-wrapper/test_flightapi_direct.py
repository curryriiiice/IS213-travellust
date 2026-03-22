"""
Direct FlightAPI testing script for testing actual API calls
"""
import os
import sys
from datetime import datetime, timedelta

def test_flightapi_direct():
    """Test direct connection to FlightAPI"""

    print("🧪 Testing FlightAPI Direct Connectivity")
    print("=" * 60)

    # Configuration
    api_key = os.getenv('FLIGHTAPI_KEY', '69ba7773bf52a03fdc55db62')
    base_url = os.getenv('FLIGHTAPI_BASE_URL', 'https://api.flightapi.io')

    print(f"✅ API Key: {api_key[:10]}...")
    print(f"✅ Base URL: {base_url}")

    import requests

    # Test parameters - using realistic dates within airline scheduling window
    origin = 'SIN'      # Singapore
    destination = 'HKG' # Hong Kong
    departure_date = '2026-04-01'
    return_date = '2026-04-08'
    adults = 1
    children = 0
    infants = 0
    cabin_class = 'Economy'
    currency = 'USD'

    # Construct the FlightAPI roundtrip URL
    url = (
        f"{base_url}/roundtrip/{api_key}/"
        f"{origin}/{destination}/{departure_date}/{return_date}/"
        f"{adults}/{children}/{infants}/{cabin_class}/{currency}"
    )

    print(f"\n📡 Test: Direct FlightAPI Request")
    print("-" * 60)
    print(f"Request URL: {url}")
    print(f"Parameters:")
    print(f"   Origin: {origin}")
    print(f"   Destination: {destination}")
    print(f"   Departure Date: {departure_date}")
    print(f"   Return Date: {return_date}")
    print(f"   Adults: {adults}")
    print(f"   Cabin Class: {cabin_class}")
    print(f"   Currency: {currency}")

    try:
        print(f"\n⏳ Making request to FlightAPI...")
        response = requests.get(url, timeout=60)

        print(f"\n✅ FlightAPI request completed")
        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()

                # Display response structure
                print(f"\n📊 Response Data Structure:")
                print(f"   Top-level keys: {list(data.keys())}")

                # Try to find flight data
                if 'trips' in data and data['trips']:
                    print(f"   ✅ Found 'trips' with {len(data['trips'])} flights")
                    if data['trips']:
                        first_flight = data['trips'][0]
                        print(f"   Sample flight structure:")
                        print(f"   Keys: {list(first_flight.keys())}")

                        # Try to extract price
                        if 'price' in first_flight:
                            price = first_flight['price']
                            print(f"   ✅ Price data: {price}")
                        if 'totalPrice' in first_flight:
                            price = first_flight['totalPrice']
                            print(f"   ✅ Total price: {price}")

                elif 'data' in data and data['data']:
                    print(f"   ✅ Found 'data' with {len(data['data'])} entries")
                elif 'flights' in data and data['flights']:
                    print(f"   ✅ Found 'flights' with {len(data['flights'])} entries")
                else:
                    print(f"   ⚠️  No flight data in response")

                # Show raw JSON for debugging
                print(f"\n📄 Full JSON Response:")
                print(f"   {json.dumps(data, indent=2)[:1000]}...")

                # Check if we can parse the data with our client
                print(f"\n🧪 Testing FlightAPIClient parsing...")
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
                from src.flightapi_client import FlightAPIClient
                from src.config import Config

                config = Config()
                client = FlightAPIClient(config)

                # Try to parse the response
                try:
                    flights = client._parse_flights(data)
                    print(f"   ✅ Parsed {len(flights)} flights")

                    if flights:
                        print(f"   Sample parsed flight:")
                        for key, value in flights[0].items():
                            print(f"      {key}: {value}")

                except Exception as parse_error:
                    print(f"   ⚠️  Parsing error: {parse_error}")

            except Exception as json_error:
                print(f"   ⚠️  Could not parse JSON: {json_error}")
                print(f"   Raw response: {response.text[:500]}")

        elif response.status_code == 400:
            print(f"   ❌ Bad request (400)")
            print(f"   Raw response: {response.text[:500]}")
            print(f"   Possible issues: Invalid airport codes, dates, or parameters")
        elif response.status_code == 401:
            print(f"   ❌ Unauthorized (401)")
            print(f"   Check your FlightAPI key")
        elif response.status_code == 403:
            print(f"   ❌ Forbidden (403)")
            print(f"   You may not have permission to access this API")
        elif response.status_code == 404:
            print(f"   ❌ Not found (404)")
            print(f"   The API endpoint may have changed")
        elif response.status_code == 429:
            print(f"   ❌ Rate limit exceeded (429)")
            print(f"   Too many requests, try again later")
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Raw response: {response.text[:500]}")

    except requests.Timeout:
        print(f"❌ Request to FlightAPI timed out")
        print(f"   This could indicate:")
        print(f"   1. Network connectivity issues")
        print(f"   2. FlightAPI is down or slow")
        print(f"   3. Firewall blocking requests")
    except requests.ConnectionError as e:
        print(f"❌ Connection error: {e}")
        print(f"   Check your network connection and firewall settings")
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    print(f"\n" + "=" * 60)
    print("🎉 FlightAPI direct test completed!")

def main():
    import json  # Need json module for debugging

    print("🚀 FlightAPI Direct Test")
    print("=" * 60)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    test_flightapi_direct()

    print("\n" + "=" * 60)
    print("Next steps:")
    print("1. If the direct API call works: Test the full integration")
    print("2. If parsing fails: Update the _parse_flights method")
    print("3. If API call fails: Check your API key and parameters")
    print("4. Test the Flask endpoint: curl http://localhost:5001/api/health")

    return 0

if __name__ == '__main__':
    import json
    sys.exit(main())
