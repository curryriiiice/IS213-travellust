import type { Trip } from "@/types/trip";

/**
 * The shape of a raw trip record coming back from trips_atomic.
 * member_ids is an array of user UUIDs who belong to the trip.
 * nodes are not stored in this table – we render a summary card instead.
 */
interface RawTrip {
  id: string;
  trip_name?: string | null;
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
    name: raw.trip_name || destination,
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

/** Create a new trip and return it mapped to the frontend Trip shape. */
export async function createTrip(
  userId: string,
  data: {
    name: string;
    destination: string;
    startDate: string;
    budget: number;
    currency: string;
  }
): Promise<Trip> {
  const res = await fetch("/api/trips-atomic/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_name: data.name,
      locations: [data.destination],
      trip_date: data.startDate,
      calculated_cost: data.budget,
      member_ids: [userId],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to create trip (${res.status})`);
  }

  const json = await res.json();
  const raw: RawTrip = json.data;

  return mapRawTrip(raw);
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

/** Fetch a single trip by ID from the trips_atomic service. */
export async function fetchTripById(tripId: string): Promise<Trip | null> {
  try {
    const response = await fetch(`/api/trips-atomic/trips/${tripId}`);

    if (!response.ok) {
      console.warn(`Failed to fetch trip ${tripId}: ${response.status}`);
      return null;
    }

    const json = await response.json();
    const raw: RawTrip = json.data;

    if (!raw) {
      console.warn(`Trip ${tripId} not found`);
      return null;
    }

    return mapRawTrip(raw);
  } catch (error) {
    console.error(`Error fetching trip ${tripId}:`, error);
    return null;
  }
}
