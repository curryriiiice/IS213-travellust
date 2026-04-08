import { parsePlanResponse } from "@/api/plan";
import { handleApiError, isRetryableError, retryWithBackoff } from "@/utils/apiErrorHandler";

export interface FlightOffer {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  departureTimeConverted: string;
  arrivalTime: string;
  arrivalTimeConverted: string;
  arrivalDateTime: string; // Full datetime for API calls (YYYY-MM-DD HH:MM:SS)
  duration: string;
  durationMinutes: number;
  aircraft: string;
  cabin: "economy";
  price: number;
  currency: string;
  legroom: string;
  co2Kg: number;
  externalLink: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

// Plan service response interface for flight search
interface FlightPlanResponse {
  flights?: FlightApiResponse[];
  search_metadata?: Record<string, any>;
}

// API response wrapper for direct flight search responses
interface DirectFlightSearchResponse {
  data: FlightApiResponse[];
  success: boolean;
}

// Amadeus-style airport codes with timezone offsets (from UTC)
export const airports: Record<string, { name: string; timezone: string; offset: number }> = {
  ATL: { name: "Atlanta", timezone: "America/New_York", offset: -4 },
  DXB: { name: "Dubai", timezone: "Asia/Dubai", offset: 4 },
  DFW: { name: "Dallas/Fort Worth", timezone: "America/Chicago", offset: -5 },
  HND: { name: "Tokyo Haneda", timezone: "Asia/Tokyo", offset: 9 },
  LHR: { name: "London Heathrow", timezone: "Europe/London", offset: 1 },
  DEN: { name: "Denver", timezone: "America/Denver", offset: -6 },
  IST: { name: "Istanbul", timezone: "Europe/Istanbul", offset: 3 },
  ORD: { name: "Chicago O'Hare", timezone: "America/Chicago", offset: -5 },
  DEL: { name: "New Delhi", timezone: "Asia/Kolkata", offset: 5.5 },
  PVG: { name: "Shanghai Pudong", timezone: "Asia/Shanghai", offset: 8 },
  LAX: { name: "Los Angeles", timezone: "America/Los_Angeles", offset: -7 },
  CAN: { name: "Guangzhou", timezone: "Asia/Shanghai", offset: 8 },
  ICN: { name: "Seoul Incheon", timezone: "Asia/Seoul", offset: 9 },
  CDG: { name: "Paris CDG", timezone: "Europe/Paris", offset: 2 },
  SIN: { name: "Singapore", timezone: "Asia/Singapore", offset: 8 },
  PEK: { name: "Beijing Capital", timezone: "Asia/Shanghai", offset: 8 },
  AMS: { name: "Amsterdam", timezone: "Europe/Amsterdam", offset: 2 },
  MAD: { name: "Madrid", timezone: "Europe/Madrid", offset: 2 },
  JFK: { name: "New York JFK", timezone: "America/New_York", offset: -4 },
  SZX: { name: "Shenzhen", timezone: "Asia/Shanghai", offset: 8 },
  BKK: { name: "Bangkok", timezone: "Asia/Bangkok", offset: 7 },
  FRA: { name: "Frankfurt", timezone: "Europe/Berlin", offset: 2 },
  CLT: { name: "Charlotte", timezone: "America/New_York", offset: -4 },
  MIA: { name: "Miami", timezone: "America/New_York", offset: -4 },
  MCO: { name: "Orlando", timezone: "America/New_York", offset: -4 },
  LAS: { name: "Las Vegas", timezone: "America/Los_Angeles", offset: -7 },
  SEA: { name: "Seattle", timezone: "America/Los_Angeles", offset: -7 },
  MEX: { name: "Mexico City", timezone: "America/Mexico_City", offset: -6 },
  MUC: { name: "Munich", timezone: "Europe/Berlin", offset: 2 },
  PHX: { name: "Phoenix", timezone: "America/Phoenix", offset: -7 },
  EWR: { name: "Newark", timezone: "America/New_York", offset: -4 },
  SFO: { name: "San Francisco", timezone: "America/Los_Angeles", offset: -7 },
  HKG: { name: "Hong Kong", timezone: "Asia/Hong_Kong", offset: 8 },
  FCO: { name: "Rome", timezone: "Europe/Rome", offset: 2 },
  BCN: { name: "Barcelona", timezone: "Europe/Madrid", offset: 2 },
  IAH: { name: "Houston", timezone: "America/Chicago", offset: -5 },
  YYZ: { name: "Toronto", timezone: "America/Toronto", offset: -4 },
  KMG: { name: "Kunming", timezone: "Asia/Shanghai", offset: 8 },
  CTU: { name: "Chengdu", timezone: "Asia/Shanghai", offset: 8 },
  GRU: { name: "São Paulo", timezone: "America/Sao_Paulo", offset: -3 },
  MSP: { name: "Minneapolis", timezone: "America/Chicago", offset: -5 },
  SLC: { name: "Salt Lake City", timezone: "America/Denver", offset: -6 },
  BOM: { name: "Mumbai", timezone: "Asia/Kolkata", offset: 5.5 },
  XIY: { name: "Xi'an", timezone: "Asia/Shanghai", offset: 8 },
  DTW: { name: "Detroit", timezone: "America/Detroit", offset: -4 },
  BOS: { name: "Boston", timezone: "America/New_York", offset: -4 },
  NRT: { name: "Tokyo Narita", timezone: "Asia/Tokyo", offset: 9 },
  PHL: { name: "Philadelphia", timezone: "America/New_York", offset: -4 },
  FLL: { name: "Fort Lauderdale", timezone: "America/New_York", offset: -4 },
  SYD: { name: "Sydney", timezone: "Australia/Sydney", offset: 10 },
  KUL: { name: "Kuala Lumpur", timezone: "Asia/Kuala_Lumpur", offset: 8 },
  TPE: { name: "Taipei", timezone: "Asia/Taipei", offset: 8 },
};

// API response interface
interface FlightSearchResponse {
  count: number;
  data: FlightApiResponse[];
  success: boolean;
}

interface FlightApiResponse {
  airline: string;
  aircraft_type: string;
  co2_kg: number;
  currency: string;
  datetime_arrival: string;
  datetime_departure: string;
  external_link: string;
  flight_number: string;
  legroom: string;
  price_sgd: number;
  price_usd: number;
}

// Helper: Convert date (YYYY-MM-DD) + 00:00 UTC to ISO string
export function convertSGDateToUTC(dateStr: string): string {
  // Parse the date string and create a datetime in UTC
  const utcDate = new Date(`${dateStr}T00:00:00.000Z`);
  // Return ISO string
  return utcDate.toISOString();
}

// Helper: Parse API local datetime string to UTC epoch milliseconds
function parseLocalTimeAsUTC(dateTimeStr: string, offsetHours: number): number {
  const [datePart, timePart] = dateTimeStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const localEpoch = Date.UTC(year, month - 1, day, hour, minute);
  return localEpoch - (offsetHours * 60 * 60 * 1000);
}

// Helper: Calculate duration between two UTC epochs
function calculateDuration(depMs: number, arrMs: number): { duration: string; durationMinutes: number } {
  const diffMs = arrMs - depMs;
  const diffMins = Math.max(0, Math.round(diffMs / (1000 * 60)));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return {
    duration: `${hours}h ${mins}m`,
    durationMinutes: diffMins,
  };
}

// Helper: Format UTC epoch to HH:MM at a specific timezone offset
function formatTimeAtOffset(timestampMs: number, offsetHours: number): string {
  const localEpoch = timestampMs + (offsetHours * 60 * 60 * 1000);
  const d = new Date(localEpoch);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// Helper: Parse airline code from flight number (e.g., "MH 616" -> "MH")
function parseAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z]{2,3})/);
  return match ? match[1] : flightNumber.slice(0, 2);
}

// Helper: Generate unique ID
function generateId(): string {
  return `fl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Main function to map API response to FlightOffer
export function mapApiFlightToOffer(
  apiFlight: FlightApiResponse,
  origin: string,
  destination: string
): FlightOffer {
  const originAirport = airports[origin] || { name: origin, timezone: "UTC", offset: 0 };
  const destAirport = airports[destination] || { name: destination, timezone: "UTC", offset: 0 };

  const depMs = parseLocalTimeAsUTC(apiFlight.datetime_departure, originAirport.offset);
  const arrMs = parseLocalTimeAsUTC(apiFlight.datetime_arrival, destAirport.offset);
  const { duration, durationMinutes } = calculateDuration(depMs, arrMs);

  const localDepTime = apiFlight.datetime_departure.split(" ")[1];
  const localArrTime = apiFlight.datetime_arrival.split(" ")[1];

  const depTimeConverted = originAirport.offset === destAirport.offset ? "" : formatTimeAtOffset(depMs, destAirport.offset);
  const arrTimeConverted = originAirport.offset === destAirport.offset ? "" : formatTimeAtOffset(arrMs, originAirport.offset);

  // Store the full datetime for API calls (convert space to T for ISO format)
  const arrivalDateTime = apiFlight.datetime_arrival.replace(" ", "T");

  return {
    id: generateId(),
    airline: apiFlight.airline,
    airlineCode: parseAirlineCode(apiFlight.flight_number),
    flightNumber: apiFlight.flight_number,
    origin,
    originCity: originAirport.name,
    destination,
    destinationCity: destAirport.name,
    departureTime: localDepTime,
    departureTimeConverted: depTimeConverted,
    arrivalTime: localArrTime,
    arrivalTimeConverted: arrTimeConverted,
    arrivalDateTime, // Full datetime for API calls
    duration,
    durationMinutes,
    aircraft: apiFlight.aircraft_type,
    cabin: "economy",
    price: apiFlight.price_sgd,
    currency: apiFlight.currency,
    legroom: apiFlight.legroom,
    co2Kg: apiFlight.co2_kg,
    externalLink: apiFlight.external_link,
  };
}

// API call function
/**
 * Search for flights using the plan service gateway.
 *
 * This function routes search requests through the plan service for consistent
 * error handling and future extensibility. The plan service validates requests
 * and forwards to the flight-management service.
 *
 * Features:
 * - Automatic retry logic for transient errors (network issues, timeouts, server errors)
 * - Standardized error handling with user-friendly messages
 * - Support for optional search parameters (children, cabin class, currency)
 * - Exponential backoff for retries (1s, 2s delays)
 *
 * @param origin - Airport code for departure (e.g., "SIN")
 * @param destination - Airport code for arrival (e.g., "HKG")
 * @param date - Departure date in YYYY-MM-DD format
 * @param options - Optional search parameters
 * @param options.adults - Number of adult passengers (default: 1)
 * @param options.children - Number of child passengers (optional)
 * @param options.cabin_class - Cabin class: "economy" | "business" | "first" (optional)
 * @param options.currency - Currency for pricing (default: "SGD")
 * @returns Promise<FlightOffer[]> - Array of flight search results
 * @throws {Error} - For validation, network, or server errors with user-friendly messages
 *
 * @example
 * // Basic flight search
 * const flights = await searchFlights("SIN", "HKG", "2026-04-15");
 *
 * @example
 * // Flight search with options
 * const flights = await searchFlights("SIN", "HKG", "2026-04-15", {
 *   adults: 2,
 *   children: 1,
 *   cabin_class: "business",
 *   currency: "USD"
 * });
 */
export async function searchFlights(
  origin: string,
  destination: string,
  date: string,
  options?: {
    adults?: number;
    children?: number;
    cabin_class?: "economy" | "business" | "first";
    currency?: string;
  }
): Promise<FlightOffer[]> {
  console.log("searchFlights called with:", origin, destination, date, options);

  return retryWithBackoff(async () => {
    const datetimeDeparture = convertSGDateToUTC(date);

    const payload = {
      origin,
      destination,
      datetime_departure: datetimeDeparture,
      adults: options?.adults ?? 1,
      currency: options?.currency ?? "SGD",
      ...(options?.children !== undefined && { children: options.children }),
      ...(options?.cabin_class && { cabin_class: options.cabin_class }),
    };
    console.log("Flight search payload:", JSON.stringify(payload, null, 2));

    const response = await fetch("/api/plan/flights/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await parsePlanResponse<FlightPlanResponse | DirectFlightSearchResponse>(response);
    if (!response.ok || !json.success) {
      const error = await handleApiError({ response, message: json.error }, "flight search");
      throw new Error(error.message);
    }

    // Handle both response structures: { data: [...] } and { data: { flights: [...] } }
    const flights = Array.isArray(json.data) ? json.data : json.data?.flights || [];
    return flights.map((flight) => mapApiFlightToOffer(flight, origin, destination));
  }, 2, 1000); // maxRetries: 2, baseDelay: 1000ms
}

// Legacy mock data (kept for reference/testing)
export const mockFlightResults: FlightOffer[] = [];
