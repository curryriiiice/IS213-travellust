import type { ItineraryNode } from "@/types/trip";

/**
 * Raw attraction response from attractions service
 */
interface RawAttraction {
  attraction_id: string;
  trip_id?: string;
  name: string;
  location: string;
  gmaps_link?: string;
  visit_time: string;
  duration_minutes: number;
  cost: string | number;
  catalog_attraction_id?: string;
  deleted?: boolean;
  created_at?: string;
}

/**
 * Raw response wrapper from attractions service
 */
interface AttractionsResponse {
  data?: RawAttraction[];
  count?: number;
  error?: string;
}

/**
 * Safely parse datetime string
 */
function parseDateTime(dateTimeStr: string): Date {
  let date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) {
    date = new Date(`${dateTimeStr}Z`);
  }
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
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
  const visitDate = parseDateTime(raw.visit_time);

  // Extract date (YYYY-MM-DD) and time (HH:mm)
  const date = visitDate.toISOString().split("T")[0];
  const time = visitDate.toTimeString().slice(0, 5);

  // Format duration (e.g., "2h 30m")
  const duration = formatDuration(raw.duration_minutes);

  // Parse cost
  const cost = parseCost(raw.cost);

  // Build subtitle with location
  const subtitle = raw.location;

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
    status: "pending",
    details: {
      name: raw.name,
      gmaps_link: raw.gmaps_link || "",
      visit_time: raw.visit_time,
      duration_minutes: raw.duration_minutes.toString(),
      location: raw.location,
    },
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
      console.warn(`Failed to fetch attractions for trip ${tripId}: ${response.status}`);
      return [];
    }

    const json: AttractionsResponse = await response.json();

    if (!json.data) {
      console.warn(`No attractions data for trip ${tripId}`);
      return [];
    }

    console.log(`Fetched ${json.data.length} attractions for trip ${tripId}`);
    // Filter out deleted attractions and map to ItineraryNode
    return json.data
      .filter((attraction) => !attraction.deleted)
      .map((raw) => mapAttractionToNode(raw, tripCurrency));
  } catch (error) {
    console.error(`Error fetching attractions for trip ${tripId}:`, error);
    return [];
  }
}
