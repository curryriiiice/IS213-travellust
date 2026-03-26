"""Book Hotels Composite Microservice - Orchestrator for hotel bookings."""
import os
import random
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv
import requests

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class BookHotelsService:
    """Composite microservice for booking hotels."""

    def __init__(self):
        """Initialize the Book Hotels Service."""
        # Service URLs (default to localhost for development)
        self.trips_atomic_url = os.getenv("TRIPS_ATOMIC_URL", "http://trips_atomic:5000")
        self.hotel_management_url = os.getenv("HOTEL_MANAGEMENT_URL", "http://hotel-management:5000")
        self.booked_tickets_url = os.getenv("BOOKED_TICKETS_URL", "http://booked_tickets:5000")

        # AMQP Configuration
        self.amqp_url = os.getenv("AMQP_URL", "amqp://localhost:5672")
        self.amqp_exchange = os.getenv("AMQP_EXCHANGE", "bookings")
        self.amqp_routing_key_activity = os.getenv("AMQP_ROUTING_KEY_ACTIVITY", "booking.activity")
        self.amqp_routing_key_error = os.getenv("AMQP_ROUTING_KEY_ERROR", "booking.error")

    def verify_hotel_ownership(
        self,
        trip_id: str,
        hotel_id: str,
    ) -> Dict[str, Any]:
        """
        Verify if a hotel belongs to a trip by querying the trips_atomic service.

        Args:
            trip_id: Trip UUID
            hotel_id: Hotel UUID

        Returns:
            Dictionary containing:
            - is_owner: Boolean indicating if hotel belongs to trip
            - trip: Trip details if found
            - status: Operation status
        """
        try:
            # Query trips_atomic service to get trip details
            response = requests.get(
                f"{self.trips_atomic_url}/api/trips/{trip_id}",
                timeout=10,
            )

            if response.status_code == 404:
                return {
                    "is_owner": False,
                    "trip": None,
                    "status": "error",
                    "error": "Trip not found",
                }

            if response.status_code != 200:
                return {
                    "is_owner": False,
                    "trip": None,
                    "status": "error",
                    "error": f"Failed to fetch trip: {response.status_code}",
                }

            trip_data = response.json()

            # Check if hotel_id is in the trip's hotel_ids array
            hotel_ids = trip_data.get("data", {}).get("hotel_ids", [])

            if hotel_id not in hotel_ids:
                return {
                    "is_owner": False,
                    "trip": None,
                    "status": "error",
                    "error": "Hotel not found in trip's hotel list",
                }

            return {
                "is_owner": True,
                "trip": trip_data,
                "status": "success",
            }

        except requests.exceptions.RequestException as e:
            return {
                "is_owner": False,
                "trip": None,
                "status": "error",
                "error": f"Failed to communicate with trips_atomic service: {str(e)}",
            }
        except Exception as e:
            return {
                "is_owner": False,
                "trip": None,
                "status": "error",
                "error": f"Unexpected error: {str(e)}",
            }

    def get_hotel_details_with_latest_price(
        self,
        hotel_id: str,
    ) -> Dict[str, Any]:
        """
        Get hotel details from hotel-management MS with latest price.

        Args:
            hotel_id: Hotel UUID

        Returns:
            Dictionary containing:
            - hotel: Hotel details
            - latest_price: Latest rate_per_night
            - status: Operation status
        """
        try:
            # First, get hotel details
            response = requests.get(
                f"{self.hotel_management_url}/api/hotels/{hotel_id}",
                timeout=10,
            )

            if response.status_code == 404:
                return {
                    "hotel": None,
                    "latest_price": None,
                    "status": "error",
                    "error": "Hotel not found",
                }

            if response.status_code != 200:
                return {
                    "hotel": None,
                    "latest_price": None,
                    "status": "error",
                    "error": f"Failed to fetch hotel: {response.status_code}",
                }

            data = response.json()
            hotel = data.get("data", {}).get("hotel")

            # Fetch latest price
            response = requests.post(
                f"{self.hotel_management_url}/api/hotels/{hotel_id}/fetch-latest-price",
                timeout=30,
            )

            if response.status_code != 200:
                return {
                    "hotel": hotel,
                    "latest_price": hotel.get("rate_per_night") if hotel else None,
                    "status": "success",
                    "message": "Using existing price - failed to fetch latest",
                }

            price_data = response.json()
            latest_price = price_data.get("data", {}).get("new_price")

            return {
                "hotel": hotel,
                "latest_price": latest_price,
                "status": "success",
            }

        except requests.exceptions.RequestException as e:
            return {
                "hotel": None,
                "latest_price": None,
                "status": "error",
                "error": f"Failed to communicate with hotel-management service: {str(e)}",
            }
        except Exception as e:
            return {
                "hotel": None,
                "latest_price": None,
                "status": "error",
                "error": f"Unexpected error: {str(e)}",
            }

    def booking_fail_chance(self) -> bool:
        """
        Simulate booking failure with a 1 in 50 chance.

        Returns:
            True if booking succeeds, False if booking fails
        """
        # Generate a random number between 1 and 50
        # If the number is 1, the booking fails
        return random.randint(1, 50) != 1

    def send_to_amqp(
        self,
        booking_data: Dict[str, Any],
        is_error: bool = False,
    ) -> bool:
        """
        Send booking data to AMQP broker.

        Args:
            booking_data: Dictionary containing booking information
            is_error: True if this is an error message, False otherwise

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Try to import pika for AMQP communication
            try:
                import pika
            except ImportError:
                # pika is not installed, log and return
                print("pika is not installed. AMQP communication skipped.")
                return False

            # Connect to AMQP broker
            connection = pika.BlockingConnection(pika.URLParameters(self.amqp_url))
            channel = connection.channel()

            # Declare exchange
            channel.exchange_declare(exchange=self.amqp_exchange, exchange_type='direct', durable=True)

            # Determine routing key based on whether it's an error or activity
            routing_key = self.amqp_routing_key_error if is_error else self.amqp_routing_key_activity

            # Add timestamp to booking data
            booking_data['timestamp'] = datetime.utcnow().isoformat()
            booking_data['event_type'] = 'error' if is_error else 'activity'

            # Publish message
            channel.basic_publish(
                exchange=self.amqp_exchange,
                routing_key=routing_key,
                body=json.dumps(booking_data),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                ),
            )

            connection.close()
            return True

        except Exception as e:
            print(f"Failed to send to AMQP broker: {str(e)}")
            return False

    def create_booked_ticket(
        self,
        user_id: str,
        trip_id: str,
        hotel_id: str,
        ticket_holder_userids: List[str],
        price: float,
    ) -> Dict[str, Any]:
        """
        Create a booked_ticket entry in the booked_tickets MS.

        Args:
            user_id: User ID who is booking
            trip_id: Trip ID
            hotel_id: Hotel ID
            ticket_holder_userids: List of user IDs whose tickets are being paid for
            price: Booking price

        Returns:
            Dictionary containing:
            - booked_ticket: Created booked_ticket data
            - status: Operation status
        """
        try:
            payload = {
                "user_id": user_id,
                "trip_id": trip_id,
                "hotel_id": hotel_id,
                "ticket_holder_userids": ticket_holder_userids,
                "price": price,
                "booking_date": datetime.utcnow().isoformat(),
                "status": "booked",
            }

            response = requests.post(
                f"{self.booked_tickets_url}/api/booked_tickets",
                json=payload,
                timeout=10,
            )

            if response.status_code != 201 and response.status_code != 200:
                return {
                    "booked_ticket": None,
                    "status": "error",
                    "error": f"Failed to create booked_ticket: {response.status_code}",
                }

            booked_ticket = response.json()

            return {
                "booked_ticket": booked_ticket,
                "status": "success",
            }

        except requests.exceptions.RequestException as e:
            return {
                "booked_ticket": None,
                "status": "error",
                "error": f"Failed to communicate with booked_tickets service: {str(e)}",
            }
        except Exception as e:
            return {
                "booked_ticket": None,
                "status": "error",
                "error": f"Unexpected error: {str(e)}",
            }

    def book_hotel(
        self,
        trip_id: str,
        user_id: str,
        ticket_holder_userids: List[str],
        hotel_id: str,
    ) -> Dict[str, Any]:
        """
        Book a hotel for a trip.

        This method:
        1. Verifies if the hotel belongs to the trip
        2. Gets hotel details with latest price
        3. Simulates booking with a 1 in 50 failure chance
        4. Sends to AMQP broker (activity or error exchange)
        5. Creates a booked_ticket entry
        6. Returns booking confirmation

        Args:
            trip_id: Trip UUID
            user_id: User ID who is booking
            ticket_holder_userids: List of user IDs whose tickets are being paid for
            hotel_id: Hotel UUID to book

        Returns:
            Dictionary containing:
            - success: Boolean indicating if booking was successful
            - hotel: Hotel details
            - booked_ticket: Booked ticket details (if successful)
            - message: Confirmation or error message
            - status: Operation status
        """
        try:
            # Step 1: Verify hotel ownership
            ownership_check = self.verify_hotel_ownership(trip_id, hotel_id)

            if ownership_check.get("status") == "error":
                # Send error to AMQP
                self.send_to_amqp(
                    {
                        "trip_id": trip_id,
                        "user_id": user_id,
                        "hotel_id": hotel_id,
                        "error": ownership_check.get("error"),
                    },
                    is_error=True,
                )

                return {
                    "success": False,
                    "hotel": None,
                    "booked_ticket": None,
                    "message": "user is not part of this trip",
                    "status": "error",
                }

            # Step 2: Get hotel details with latest price
            hotel_details = self.get_hotel_details_with_latest_price(hotel_id)

            if hotel_details.get("status") == "error":
                # Send error to AMQP
                self.send_to_amqp(
                    {
                        "trip_id": trip_id,
                        "user_id": user_id,
                        "hotel_id": hotel_id,
                        "error": hotel_details.get("error"),
                    },
                    is_error=True,
                )

                return {
                    "success": False,
                    "hotel": None,
                    "booked_ticket": None,
                    "message": f"Failed to get hotel details: {hotel_details.get('error')}",
                    "status": "error",
                }

            hotel = hotel_details.get("hotel")
            price = hotel_details.get("latest_price")

            # Step 3: Simulate booking with failure chance
            booking_succeeded = self.booking_fail_chance()

            if not booking_succeeded:
                # Booking failed - send error to AMQP
                self.send_to_amqp(
                    {
                        "trip_id": trip_id,
                        "user_id": user_id,
                        "hotel_id": hotel_id,
                        "hotel_name": hotel.get("name"),
                        "ticket_holders": ticket_holder_userids,
                        "price": price,
                        "error": "Booking failed - service temporarily unavailable",
                    },
                    is_error=True,
                )

                return {
                    "success": False,
                    "hotel": hotel,
                    "booked_ticket": None,
                    "message": "Booking failed - service temporarily unavailable",
                    "status": "error",
                }

            # Step 4: Send booking activity to AMQP
            self.send_to_amqp(
                {
                    "trip_id": trip_id,
                    "user_id": user_id,
                    "hotel_id": hotel_id,
                    "hotel_name": hotel.get("name"),
                    "ticket_holders": ticket_holder_userids,
                    "price": price,
                },
                is_error=False,
            )

            # Step 5: Create booked_ticket
            booked_ticket_result = self.create_booked_ticket(
                user_id=user_id,
                trip_id=trip_id,
                hotel_id=hotel_id,
                ticket_holder_userids=ticket_holder_userids,
                price=price or 0.0,
            )

            if booked_ticket_result.get("status") == "error":
                # Even though ticket creation failed, booking was successful
                # Log this but return success
                print(f"Warning: Failed to create booked_ticket: {booked_ticket_result.get('error')}")

                return {
                    "success": True,
                    "hotel": hotel,
                    "booked_ticket": None,
                    "message": "Booking successful! However, ticket recording failed.",
                    "status": "success",
                }

            # Step 6: Return booking confirmation
            return {
                "success": True,
                "hotel": hotel,
                "booked_ticket": booked_ticket_result.get("booked_ticket"),
                "message": "Booking successful! Your hotel has been booked.",
                "status": "success",
            }

        except Exception as e:
            # Send unexpected error to AMQP
            self.send_to_amqp(
                {
                    "trip_id": trip_id,
                    "user_id": user_id,
                    "hotel_id": hotel_id,
                    "error": f"Unexpected error: {str(e)}",
                },
                is_error=True,
            )

            return {
                "success": False,
                "hotel": None,
                "booked_ticket": None,
                "message": f"An unexpected error occurred: {str(e)}",
                "status": "error",
            }

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello book-hotels - Composite orchestrator service is running"


# Initialize the service instance
book_hotels_service = BookHotelsService()
