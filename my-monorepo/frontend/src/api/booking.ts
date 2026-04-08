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

export interface BookAttractionResponse {
  data?: {
    booking_confirmation?: string;
    resolved_trip_id?: string;
  };
  error?: string;
}

async function parseBookingResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Booking service returned an empty response (${response.status}).`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Booking service returned a non-JSON response (${response.status}). This usually means the route is missing on the backend or the service returned an HTML error page.`
    );
  }
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

  const json = await parseBookingResponse<BookFlightResponse>(response);

  if (!response.ok) {
    throw new Error(json.message || `Booking failed with status ${response.status}`);
  }

  return json;
}

/**
 * Book an attraction via the book-attractions microservice.
 *
 * @param tripId      - UUID of the trip that contains this attraction
 * @param mainUserId  - UUID of the user initiating the booking
 * @param ticketHolders - Array of UUIDs for all ticket holders
 * @param attractionId - UUID of the attraction to book
 */
export async function bookAttraction(
  tripId: string,
  mainUserId: string,
  ticketHolders: string[],
  attractionId: string
): Promise<BookAttractionResponse> {
  const requestBody = {
    trip_id: tripId,
    paid_by: mainUserId,
    user_id: ticketHolders,
    attraction_id: attractionId,
  };

  console.log("Booking attraction with payload:", requestBody);

  const response = await fetch("/api/book-attractions-service/api/book-attractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const json = await parseBookingResponse<BookAttractionResponse>(response);

  if (!response.ok) {
    throw new Error(json.error || `Attraction booking failed with status ${response.status}`);
  }

  return json;
}

export async function cancelAttractionBooking(
  tripId: string,
  mainUserId: string,
  attractionId: string
): Promise<BookAttractionResponse> {
  const response = await fetch("/api/book-attractions-service/api/cancel-attractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_id: tripId,
      paid_by: mainUserId,
      user_id: [mainUserId],
      attraction_id: attractionId,
    }),
  });

  const json = await parseBookingResponse<BookAttractionResponse>(response);

  if (!response.ok) {
    throw new Error(json.error || `Attraction cancel failed with status ${response.status}`);
  }

  return json;
}

/**
 * Hotel Booking API — wraps the book-hotel microservice.
 * The proxy in vite.config.ts forwards /api/book-hotel-service/* → http://localhost:5012
 */

export interface BookHotelPayload {
  trip_id: string;
  user_id: string;
  ticket_holder_userids: string[];
  hotel_id: string;
}

export interface BookHotelResponse {
  success: boolean;
  message?: string;
  booking_id?: string;
  [key: string]: unknown;
}

/**
 * Book a hotel via the book-hotel microservice.
 *
 * @param tripId      - UUID of the trip that contains this hotel
 * @param mainUserId  - UUID of the user initiating the booking
 * @param guestIds    - Array of UUIDs for all guests (ticket holders)
 * @param hotelId     - UUID of the hotel to book
 */
export async function bookHotel(
  tripId: string,
  mainUserId: string,
  guestIds: string[],
  hotelId: string
): Promise<BookHotelResponse> {
  const payload: BookHotelPayload = {
    trip_id: tripId,
    user_id: mainUserId,
    ticket_holder_userids: guestIds,
    hotel_id: hotelId,
  };

  const response = await fetch("/api/book-hotel-service/api/book-hotel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json: BookHotelResponse = await response.json();

  if (!response.ok) {
    throw new Error(json.message || `Hotel booking failed with status ${response.status}`);
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
