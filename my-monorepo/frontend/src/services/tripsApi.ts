import type { Trip, Collaborator } from "@/types/trip";

const BASE = import.meta.env.VITE_TRIPS_URL ?? "http://localhost:5001";

// ---------------------------------------------------------------------------
// Collaborator colour palette — deterministic from user ID
// ---------------------------------------------------------------------------
const PALETTE = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 72% 60%)",
  "hsl(190 80% 45%)",
];

function idToColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function idToInitials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// API response shape — actual Supabase trips table
// ---------------------------------------------------------------------------
export interface TripRecord {
  id: string;
  locations: string[] | null;
  trip_date: string | null;
  member_ids: string[] | null;
  flight_ids: string[] | null;
  hotel_ids: string[] | null;
  attraction_ids: string[] | null;
  calculated_cost: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mapping: TripRecord → Trip (frontend type)
// ---------------------------------------------------------------------------
function toTrip(r: TripRecord): Trip {
  const memberIds: string[] = r.member_ids ?? [];
  const collaborators: Collaborator[] = memberIds.map((uid) => ({
    id: uid,
    name: uid,
    initials: idToInitials(uid),
    color: idToColor(uid),
    isOnline: false, // live status comes from the collaboration socket
  }));

  const locations = r.locations ?? [];
  const destination = locations.join(", ") || "Unknown destination";
  const name = locations.length > 0 ? `Trip to ${locations[0]}` : "Untitled Trip";

  return {
    id: r.id,
    name,
    destination,
    startDate: r.trip_date ?? r.created_at?.slice(0, 10) ?? "",
    endDate: r.trip_date ?? r.created_at?.slice(0, 10) ?? "",
    budget: 0,          // not in schema; kept as 0
    spent: r.calculated_cost ?? 0,
    currency: "USD",    // not in schema; defaulting to USD
    collaborators,
    nodes: [],          // nodes are fetched from individual services (flights/hotels/attractions)
  };
}

// Mapping: Trip (frontend) → TripRecord fields accepted by POST/PUT
function toRecord(trip: Partial<Trip>): Partial<TripRecord> {
  const rec: Partial<TripRecord> = {};
  if (trip.destination !== undefined) {
    rec.locations = trip.destination.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (trip.startDate !== undefined) rec.trip_date = trip.startDate;
  if (trip.spent !== undefined)     rec.calculated_cost = trip.spent;
  if (trip.collaborators !== undefined) {
    rec.member_ids = trip.collaborators.map((c) => c.id);
  }
  return rec;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const tripsApi = {
  async getAll(): Promise<Trip[]> {
    const json = await get<{ data: TripRecord[] }>("/api/trips");
    return json.data.map(toTrip);
  },

  async getById(id: string): Promise<Trip> {
    const json = await get<{ data: TripRecord }>(`/api/trips/${id}`);
    return toTrip(json.data);
  },

  async create(trip: Omit<Trip, "id">): Promise<Trip> {
    const body: Partial<TripRecord> = {
      locations: trip.destination.split(",").map((s) => s.trim()).filter(Boolean),
      trip_date: trip.startDate,
      member_ids: trip.collaborators.map((c) => c.id),
      flight_ids: [],
      hotel_ids: [],
      attraction_ids: [],
      calculated_cost: trip.spent,
    };
    const json = await post<{ data: TripRecord }>("/api/trips", body);
    return toTrip(json.data);
  },

  async update(id: string, patch: Partial<Trip>): Promise<Trip> {
    const json = await put<{ data: TripRecord }>(`/api/trips/${id}`, toRecord(patch));
    return toTrip(json.data);
  },

  async remove(id: string): Promise<void> {
    await del(`/api/trips/${id}`);
  },
};
