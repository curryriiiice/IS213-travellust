"""Book Hotels Composite Microservice - Orchestrator for hotel bookings."""
import os
import random
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
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

        # AMQP Configuration (travellust_notifications topic exchange)
        self.rabbitmq_host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.rabbitmq_port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.amqp_exchange = os.getenv("RABBITMQ_EXCHANGE", "travellust_notifications")

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
        routing_key: str,
        payload: Dict[str, Any],
    ) -> bool:
        """
        Publish a booking event to the travellust_notifications topic exchange.

        Args:
            routing_key: e.g. 'booking.success' or 'booking.failure'
            payload: Dictionary containing booking information

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            import pika
        except ImportError:
            print("pika is not installed. AMQP communication skipped.")
            return False

        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=self.rabbitmq_host,
                    port=self.rabbitmq_port,
                )
            )
            channel = connection.channel()
            channel.exchange_declare(
                exchange=self.amqp_exchange,
                exchange_type="topic",
                durable=True,
            )
            channel.basic_publish(
                exchange=self.amqp_exchange,
                routing_key=routing_key,
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,
                ),
            )
            connection.close()
            return True
        except Exception as e:
            print(f"Failed to publish booking event to RabbitMQ: {str(e)}")
            return False

    def create_booked_tickets(
        self,
        user_id: str,
        hotel_id: str,
        ticket_holder_userids: List[str],
        price: float,
    ) -> Dict[str, Any]:
        """
        Create booked_ticket entries in the booked_tickets MS - one per ticket holder.

        Args:
            user_id: User ID who is booking (the payer)
            hotel_id: Hotel ID (will be stored as f_h_a_id)
            ticket_holder_userids: List of user IDs whose tickets are being paid for
            price: Booking price per person

        Returns:
            Dictionary containing:
            - booked_tickets: List of created booked_ticket data
            - status: Operation status
        """
        try:
            booked_tickets = []
            errors = []

            # Create one booked ticket record for each ticket holder
            for ticket_holder_id in ticket_holder_userids:
                payload = {
                    "user_id": ticket_holder_id,  # The ticket holder
                    "f_h_a_id": hotel_id,  # The hotel ID
                    "cost": price,  # Price per ticket
                    "paid_by": user_id,  # Who paid for the ticket
                    "cancelled": False,
                }

                try:
                    response = requests.post(
                        f"{self.booked_tickets_url}/api/booked_tickets",
                        json=payload,
                        timeout=10,
                    )

                    if response.status_code != 201 and response.status_code != 200:
                        errors.append({
                            "ticket_holder_id": ticket_holder_id,
                            "error": f"Failed to create booked_ticket: {response.status_code}",
                        })
                        continue

                    booked_ticket_data = response.json()
                    booked_tickets.append(booked_ticket_data.get("data"))

                except requests.exceptions.RequestException as e:
                    errors.append({
                        "ticket_holder_id": ticket_holder_id,
                        "error": f"Failed to communicate with booked_tickets service: {str(e)}",
                    })
                except Exception as e:
                    errors.append({
                        "ticket_holder_id": ticket_holder_id,
                        "error": f"Unexpected error: {str(e)}",
                    })

            if errors:
                return {
                    "booked_tickets": booked_tickets,
                    "status": "partial_success",
                    "errors": errors,
                    "message": f"Created {len(booked_tickets)} out of {len(ticket_holder_userids)} tickets successfully.",
                }

            return {
                "booked_tickets": booked_tickets,
                "status": "success",
            }

        except Exception as e:
            return {
                "booked_tickets": booked_tickets,
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
        5. Creates booked_ticket entries (one per ticket holder)
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
            - booked_tickets: List of booked ticket details (if successful)
            - message: Confirmation or error message
            - status: Operation status
        """
        try:
            # Step 1: Verify hotel ownership
            ownership_check = self.verify_hotel_ownership(trip_id, hotel_id)

            if ownership_check.get("status") == "error":
                self.send_to_amqp("booking.failure", {
                    "service": "book-hotels",
                    "trip_id": trip_id,
                    "hotel_id": hotel_id,
                    "hotel_name": None,
                    "paid_by": user_id,
                    "user_id": ticket_holder_userids,
                    "reason": ownership_check.get("error"),
                    "status": "failure",
                })

                return {
                    "success": False,
                    "hotel": None,
                    "booked_tickets": [],
                    "message": "user is not part of this trip",
                    "status": "error",
                }

            # Step 2: Get hotel details with latest price
            hotel_details = self.get_hotel_details_with_latest_price(hotel_id)

            if hotel_details.get("status") == "error":
                self.send_to_amqp("booking.failure", {
                    "service": "book-hotels",
                    "trip_id": trip_id,
                    "hotel_id": hotel_id,
                    "hotel_name": None,
                    "paid_by": user_id,
                    "user_id": ticket_holder_userids,
                    "reason": hotel_details.get("error"),
                    "status": "failure",
                })

                return {
                    "success": False,
                    "hotel": None,
                    "booked_tickets": [],
                    "message": f"Failed to get hotel details: {hotel_details.get('error')}",
                    "status": "error",
                }

            hotel = hotel_details.get("hotel")
            price = hotel_details.get("latest_price")

            # Step 3: Simulate booking with failure chance
            booking_succeeded = self.booking_fail_chance()

            if not booking_succeeded:
                self.send_to_amqp("booking.failure", {
                    "service": "book-hotels",
                    "trip_id": trip_id,
                    "hotel_id": hotel_id,
                    "hotel_name": hotel.get("name") if hotel else None,
                    "paid_by": user_id,
                    "user_id": ticket_holder_userids,
                    "reason": "Booking failed - service temporarily unavailable",
                    "status": "failure",
                })

                return {
                    "success": False,
                    "hotel": hotel,
                    "booked_tickets": [],
                    "message": "Booking failed - service temporarily unavailable",
                    "status": "error",
                }

            # Step 4: Create booked_tickets (one per ticket holder)
            booked_tickets_result = self.create_booked_tickets(
                user_id=user_id,
                hotel_id=hotel_id,
                ticket_holder_userids=ticket_holder_userids,
                price=price or 0.0,
            )

            if booked_tickets_result.get("status") == "error":
                print(f"Warning: Failed to create booked_tickets: {booked_tickets_result.get('error')}")

                return {
                    "success": True,
                    "hotel": hotel,
                    "booked_tickets": [],
                    "message": "Booking successful! However, ticket recording failed.",
                    "status": "success",
                }

            # Step 5: Publish success notification
            booked_tickets = booked_tickets_result.get("booked_tickets", [])

            self.send_to_amqp("booking.success", {
                "service": "book-hotels",
                "trip_id": trip_id,
                "hotel_id": hotel_id,
                "hotel_name": hotel.get("name") if hotel else None,
                "paid_by": user_id,
                "user_id": ticket_holder_userids,
                "booking_id": [
                    t.get("booked_ticket_id") for t in booked_tickets if t
                ],
                "cost": price,
                "status": "success",
            })

            # Step 6: Return booking confirmation
            message = f"Booking successful! Your hotel has been booked for {len(ticket_holder_userids)} guest{'s' if len(ticket_holder_userids) > 1 else ''}."

            if booked_tickets_result.get("status") == "partial_success":
                message = f"Booking successful! Created {len(booked_tickets)} out of {len(ticket_holder_userids)} tickets."

            return {
                "success": True,
                "hotel": hotel,
                "booked_tickets": booked_tickets,
                "message": message,
                "status": "success",
            }

        except Exception as e:
            self.send_to_amqp("booking.failure", {
                "service": "book-hotels",
                "trip_id": trip_id,
                "hotel_id": hotel_id,
                "hotel_name": None,
                "paid_by": user_id,
                "user_id": ticket_holder_userids,
                "reason": f"Unexpected error: {str(e)}",
                "status": "failure",
            })

            return {
                "success": False,
                "hotel": None,
                "booked_tickets": [],
                "message": f"An unexpected error occurred: {str(e)}",
                "status": "error",
            }

    def health_check(self) -> str:
        """Return a friendly greeting for health check."""
        return "Hello book-hotels - Composite orchestrator service is running"


# Initialize the service instance
book_hotels_service = BookHotelsService()
