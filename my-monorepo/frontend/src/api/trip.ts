import type { Trip } from "@/types/trip";

/**
 * The shape of a raw trip record coming back from trips_atomic.
 * member_ids is an array of user UUIDs who belong to the trip.
 * nodes are not stored in this table – we render a summary card instead.
 */
interface RawTrip {
  id: string;
  locations?: string[];
  trip_date?: string;
  calculated_cost?: number | null;
  flight_ids?: string[] | null;
  hotel_ids?: string[] | null;
  attraction_ids?: string[] | null;
  member_ids?: string[] | null;
  created_at?: string;
}

/** Map a raw Supabase trip record to the frontend Trip shape. */
function mapRawTrip(raw: RawTrip): Trip {
  // Build a readable destination from locations array
  const destination = raw.locations?.join(", ") || "Unknown destination";

  // Use trip_date as both start and end – the table doesn't split them
  const startDate = raw.trip_date || "";
  const endDate = raw.trip_date || "";

  return {
    id: raw.id,
    name: destination,          // Use destination as trip name (no separate name field)
    destination,
    startDate,
    endDate,
    budget: raw.calculated_cost ?? 0,
    spent: 0,
    currency: "SGD",
    collaborators: [],          // member_ids are UUIDs; we don't have profiles to map yet
    nodes: [],                  // Nodes are separate – not returned by this endpoint
    flight_ids: raw.flight_ids || null,
    hotel_ids: raw.hotel_ids || null,
    attraction_ids: raw.attraction_ids || null,
    member_ids: raw.member_ids || null,
  };
}

/** Fetch all trips for the given user from the trips_atomic service. */
export async function getUserTrips(userId: string): Promise<Trip[]> {
  const response = await fetch(`/api/trips-atomic/trips/user/${userId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch trips: ${response.status}`);
  }

  const json = await response.json();
  const rawTrips: RawTrip[] = json.data ?? [];

  return rawTrips.map(mapRawTrip);
}
