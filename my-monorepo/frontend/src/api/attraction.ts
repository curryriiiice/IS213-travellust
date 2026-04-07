import type { ItineraryNode } from "@/types/trip";
import type { AttractionOffer } from "@/data/attractionData";

/**
 * Raw attraction response from attractions service
 */
interface RawAttraction {
  attraction_id: string;
  catalog_attraction_id?: string;
  trip_id?: string;
  name: string;
  location: string;
  gmaps_link?: string;
  image_url?: string;
  best_time_to_visit?: string;
  visit_time?: string;
  duration_minutes?: number;
  cost: string | number;
  status?: string;
  category?: string;
  description?: string;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Raw response wrapper from attractions service
 */
interface AttractionsResponse {
  data?: RawAttraction | RawAttraction[];
  count?: number;
  error?: string;
}

function extractDateTimeParts(rawDateTime?: string, fallback?: string): { date: string; time: string } {
  const value = rawDateTime || fallback || new Date().toISOString();
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);

  if (match) {
    return { date: match[1], time: match[2] };
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return {
      date: parsed.toISOString().slice(0, 10),
      time: parsed.toTimeString().slice(0, 5),
    };
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
  };
}

/**
 * Format duration in minutes to human-readable format (e.g., "2h 30m")
 */
function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Safely convert cost value to number
 */
function parseCost(costValue: number | string | undefined): number {
  if (costValue === undefined || costValue === null) return 0;
  if (typeof costValue === "number") return costValue;
  const parsed = parseFloat(costValue as string);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Map raw attraction data to ItineraryNode format
 */
function mapAttractionToNode(raw: RawAttraction, tripCurrency: string): ItineraryNode {
  if (!raw) {
    throw new Error("Cannot map null attraction data");
  }

  // Handle missing visit_time by using created_at as fallback
  const visitTime = raw.visit_time || raw.created_at;
  const { date, time } = extractDateTimeParts(visitTime, raw.created_at);

  // Format duration (e.g., "2h 30m")
  const duration = formatDuration(raw.duration_minutes ?? 0);

  // Parse cost
  const cost = parseCost(raw.cost);

  // Build subtitle with location
  const subtitle = raw.location;

  const derivedStatus =
    cost <= 0
      ? "added"
      : raw.status === "confirmed"
      ? "confirmed"
      : "pending";

  return {
    id: raw.attraction_id,
    type: "attraction",
      title: raw.name,
    subtitle,
    date,
    time,
    duration,
    cost: cost || 0,
    currency: tripCurrency,
    status: derivedStatus,
    sourceType: raw.catalog_attraction_id ? "catalog" : "manual",
    mapsLink: raw.gmaps_link || "",
    rawVisitTime: raw.visit_time ?? "",
    details: {
      name: raw.name,
      gmaps_link: raw.gmaps_link || "",
      visit_time: raw.visit_time ?? "",
      duration_minutes: String(raw.duration_minutes ?? 0),
      location: raw.location,
      trip_id: raw.trip_id || "",
    },
  };
}

function mapCatalogAttractionToOffer(raw: RawAttraction): AttractionOffer {
  const city = raw.location;

  return {
    id: raw.catalog_attraction_id ?? raw.attraction_id,
    name: raw.name,
    city,
    country: city,
    category: raw.category ?? "Attraction",
    description: raw.description ?? "Discover this attraction from the TravelLust catalog.",
    price: parseCost(raw.cost),
    currency: "SGD",
    durationMinutes: raw.duration_minutes ?? 120,
    bestTimeToVisit: raw.best_time_to_visit,
    rating: 0,
    reviewCount: 0,
    openingHours: "See operator details",
    address: raw.location,
    gmapsLink: raw.gmaps_link,
    imageUrl: raw.image_url,
  };
}

/**
 * Fetch attractions for a trip from attractions service
 * @param tripId - The trip UUID
 * @param tripCurrency - The trip's currency (defaults to "SGD" if not provided)
 * @returns Array of mapped ItineraryNode objects
 */
export async function fetchAttractionsByTripId(tripId: string, tripCurrency: string = "SGD"): Promise<ItineraryNode[]> {
  try {
    const response = await fetch(`/api/attractions-service/trips/${tripId}/attractions`);

    if (!response.ok) {
      return [];
    }

    const json: AttractionsResponse = await response.json();

    if (!json.data) {
      return [];
    }

    // Handle both array and single object responses
    const attractionData = Array.isArray(json.data) ? json.data : [json.data];

    // Filter out deleted attractions and map to ItineraryNode
    return attractionData
      .filter((attraction): attraction is RawAttraction => !attraction.deleted)
      .map((raw) => mapAttractionToNode(raw, tripCurrency));
  } catch (error) {
    return [];
  }
}

async function fetchCatalogAttractionsFromPath(path: string): Promise<AttractionOffer[]> {
  const response = await fetch(path);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch attractions: ${response.status}`);
  }

  const json: AttractionsResponse = await response.json();

  if (!json.data) {
    return [];
  }

  // Handle both array and single object responses
  const attractionData = Array.isArray(json.data) ? json.data : [json.data];

  return attractionData.map(mapCatalogAttractionToOffer);
}

export async function searchCatalogAttractions(query: string): Promise<AttractionOffer[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const response = await fetch(
    `/api/attractions-service/catalog/attractions?search=${encodeURIComponent(trimmed)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to search attractions: ${response.status}`);
  }

  const json: AttractionsResponse = await response.json();

  if (!json.data) {
    return [];
  }

  // Handle both array and single object responses
  const attractionData = Array.isArray(json.data) ? json.data : [json.data];
  return attractionData.map(mapCatalogAttractionToOffer);
}

export async function fetchCatalogAttractions(): Promise<AttractionOffer[]> {
  return fetchCatalogAttractionsFromPath("/api/attractions-service/catalog/attractions");
}

export async function fetchCatalogAttractionsByLocation(location: string): Promise<AttractionOffer[]> {
  return fetchCatalogAttractionsFromPath(
    `/api/attractions-service/catalog/attractions/location/${encodeURIComponent(location)}`
  );
}

export async function fetchCatalogAttractionLocations(): Promise<string[]> {
  const response = await fetch("/api/attractions-service/catalog/attractions/locations");

  if (!response.ok) {
    throw new Error(`Failed to fetch attraction locations: ${response.status}`);
  }

  const json: { data?: string[] } = await response.json();
  return (json.data ?? []).map((location) => location.trim()).filter(Boolean);
}

/**
 * Fetch attraction details by ID from attractions service
 * @param attractionId - The attraction UUID
 * @param tripCurrency - The trip's currency (defaults to "SGD" if not provided)
 * @returns The mapped ItineraryNode or null if fetch fails
 */
export async function fetchAttractionById(attractionId: string, tripCurrency: string = "SGD"): Promise<ItineraryNode | null> {
  try {
    const url = `/api/attractions-service/attractions/${attractionId}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const json: AttractionsResponse = await response.json();

    // Handle both single object and array responses
    let attractionData: RawAttraction | null = null;

    if (!json.data) {
      return null;
    }

    // Check if data is an array or single object
    if (Array.isArray(json.data)) {
      if (json.data.length === 0) {
        return null;
      }
      attractionData = json.data[0];
    } else {
      // Single object
      attractionData = json.data as RawAttraction;
    }

    if (!attractionData) {
      return null;
    }

    return mapAttractionToNode(attractionData, tripCurrency);
  } catch (error) {
    return null;
  }
}
