import type { ItineraryNode } from "@/types/trip";

/**
 * Raw flight response from flight-management composite service
 */
interface RawFlight {
  flight_id: string;
  flight_number: string;
  airline: string;
  datetime_departure: string;
  datetime_arrival: string;
  external_link?: string;
  trip_id?: string;
  cost?: number | string;
  aircraft_type?: string;
  legroom?: string;
  co2_kg?: number;
  price_sgd?: number | string;
  price_usd?: number | string;
  origin?: string;
  destination?: string;
  created_at?: string;
}

/**
 * Raw response wrapper from flight-management service
 */
interface FlightResponse {
  success: boolean;
  data?: RawFlight;
  error?: string;
}

/**
 * Safely parse datetime string, handling various formats
 */
function parseDateTime(dateTimeStr: string): Date {
  // Try parsing as-is
  let date = new Date(dateTimeStr);

  // If invalid or NaN, try appending 'Z' for UTC
  if (isNaN(date.getTime())) {
    date = new Date(`${dateTimeStr}Z`);
  }

  // If still invalid, return current date as fallback
  if (isNaN(date.getTime())) {
    console.warn(`Failed to parse datetime: ${dateTimeStr}`);
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
 * Map raw flight data to ItineraryNode format
 */
function mapFlightToNode(raw: RawFlight, tripCurrency: string): ItineraryNode {
  const departureDate = parseDateTime(raw.datetime_departure);
  const arrivalDate = parseDateTime(raw.datetime_arrival);

  console.log("Flight mapping:", {
    departure: raw.datetime_departure,
    arrival: raw.datetime_arrival,
    parsedDeparture: departureDate.toISOString(),
    parsedArrival: arrivalDate.toISOString(),
  });

  // Extract date (YYYY-MM-DD) and time (HH:mm)
  const date = departureDate.toISOString().split("T")[0];
  const time = departureDate.toTimeString().slice(0, 5);
  const arrivalTime = arrivalDate.toTimeString().slice(0, 5);

  // Calculate duration in minutes
  const durationMs = arrivalDate.getTime() - departureDate.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  // Handle negative duration (arrival before departure) - might indicate crossing timezone
  const adjustedDurationMinutes = durationMinutes < 0 ? durationMinutes + (24 * 60) : durationMinutes;
  const duration = formatDuration(adjustedDurationMinutes);

  // Determine cost based on currency
  let cost = 0;
  if (tripCurrency === "SGD") {
    cost = parseCost(raw.price_sgd) || parseCost(raw.cost);
  } else {
    cost = parseCost(raw.price_usd) || parseCost(raw.cost);
  }

  // Build subtitle with route information
  const subtitle = `${raw.airline} · ${raw.flight_number}`;

  return {
    id: raw.flight_id,
    type: "flight",
    title: raw.airline,
    subtitle,
    date,
    time,
    duration,
    cost,
    currency: tripCurrency,
    status: "pending",
    details: {
      flight_number: raw.flight_number,
      airline: raw.airline,
      aircraft_type: raw.aircraft_type || "",
      legroom: raw.legroom || "",
      co2_kg: parseCost(raw.co2_kg).toString(),
      external_link: raw.external_link || "",
      datetime_departure: raw.datetime_departure,
      datetime_arrival: raw.datetime_arrival,
      origin: raw.origin || "",
      destination: raw.destination || "",
      // Store raw costs for reference
      price_sgd: parseCost(raw.price_sgd).toString(),
      price_usd: parseCost(raw.price_usd).toString(),
    },
  };
}

/**
 * Fetch flight details by ID from flight-management composite service
 * @param flightId - The flight UUID
 * @param tripCurrency - The trip's currency (defaults to "SGD" if not provided)
 * @returns The mapped ItineraryNode or null if fetch fails
 */
export async function fetchFlightById(flightId: string, tripCurrency: string = "SGD"): Promise<ItineraryNode | null> {
  try {
    const response = await fetch(`/api/flights/${flightId}`);

    if (!response.ok) {
      console.warn(`Failed to fetch flight ${flightId}: ${response.status}`);
      return null;
    }

    const json: FlightResponse = await response.json();

    if (!json.success || !json.data) {
      console.warn(`Invalid flight response for ${flightId}`);
      return null;
    }

    console.log("Fetched flight data:", json.data);
    return mapFlightToNode(json.data, tripCurrency);
  } catch (error) {
    console.error(`Error fetching flight ${flightId}:`, error);
    return null;
  }
}
