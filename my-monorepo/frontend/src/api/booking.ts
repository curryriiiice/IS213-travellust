/**
 * Booking API — wraps the book-flight composite microservice.
 * The proxy in vite.config.ts forwards /api/book-flight-service/* → http://localhost:5014
 */

export interface BookFlightPayload {
  trip_id: string;
  user_id: string;   // main user making the booking
  user_ids: string[]; // ticket holders (including or excluding main user)
  flight_id: string;
}

export interface BookFlightResponse {
  success: boolean;
  message?: string;
  booking_id?: string;
  [key: string]: unknown;
}

/**
 * Book a flight via the composite book-flight microservice.
 *
 * @param tripId      - UUID of the trip that contains this flight
 * @param mainUserId  - UUID of the user initiating the booking
 * @param ticketHolders - Array of UUIDs for all ticket holders
 * @param flightId    - UUID of the flight to book
 */
export async function bookFlight(
  tripId: string,
  mainUserId: string,
  ticketHolders: string[],
  flightId: string
): Promise<BookFlightResponse> {
  const payload: BookFlightPayload = {
    trip_id: tripId,
    user_id: mainUserId,
    user_ids: ticketHolders,
    flight_id: flightId,
  };

  const response = await fetch("/api/book-flight-service/api/bookflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json: BookFlightResponse = await response.json();

  if (!response.ok) {
    throw new Error(json.message || `Booking failed with status ${response.status}`);
  }

  return json;
}

/**
 * Represents a single row from the booked_tickets table.
 * The `f_h_a_id` field holds the UUID of the flight, hotel, or attraction.
 */
export interface BookedTicket {
  booked_ticket_id: number;
  user_id: string;
  f_h_a_id: string;  // flight / hotel / attraction UUID
  cost: number;
  paid_by: string;
  cancelled: boolean;
}

/**
 * Fetch all booked tickets for a given user from the booked_tickets atomic service.
 * Returns an empty array if the service is unavailable (fail-open).
 */
export async function getUserBookedTickets(userId: string): Promise<BookedTicket[]> {
  try {
    const response = await fetch(`/api/booked-tickets/api/users/${userId}/booked_tickets`);
    if (!response.ok) {
      console.warn(`Failed to fetch booked tickets for user ${userId}: ${response.status}`);
      return [];
    }
    const json: { data: BookedTicket[]; count: number } = await response.json();
    // Filter out cancelled tickets — treat them as not booked
    return (json.data ?? []).filter((t) => !t.cancelled);
  } catch (err) {
    console.error("getUserBookedTickets error:", err);
    return [];
  }
}
