import type { ItineraryNode } from "@/types/trip";

/**
 * Raw hotel response from hotel-management composite service
 */
interface RawHotel {
  hotel_id: string;
  name: string;
  datetime_check_in: string;
  datetime_check_out: string;
  description?: string;
  external_link?: string;
  link?: string;
  overall_rating?: number;
  rate_per_night: number | string;
  lat?: number;
  long?: number;
  amenities?: string[];
  photos?: string[];
  trip_id?: string;
  cost?: number | string;
  created_at?: string;
}

/**
 * Raw response wrapper from hotel-management service
 */
interface HotelResponse {
  success?: boolean;
  data?: {
    hotel: RawHotel;
  };
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
 * Safely convert cost value to number
 */
function parseCost(costValue: number | string | undefined): number {
  if (costValue === undefined || costValue === null) return 0;
  if (typeof costValue === "number") return costValue;
  const parsed = parseFloat(costValue as string);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Map raw hotel data to ItineraryNode format
 */
function mapHotelToNode(raw: RawHotel, tripCurrency: string): ItineraryNode {
  const checkInDate = parseDateTime(raw.datetime_check_in);
  const checkOutDate = parseDateTime(raw.datetime_check_out);

  // Extract date (YYYY-MM-DD) and time (default to 15:00 for check-in)
  const date = checkInDate.toISOString().split("T")[0];
  const time = "15:00"; // Standard hotel check-in time

  // Calculate duration (number of nights)
  const durationMs = checkOutDate.getTime() - checkInDate.getTime();
  const nights = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
  const duration = `${nights} night${nights !== 1 ? "s" : ""}`;

  // Get per-night rate (prefer cost field if it represents per-night)
  const ratePerNight = parseCost(raw.cost) || parseCost(raw.rate_per_night);
  const totalCost = ratePerNight * nights;

  // Build subtitle with location info
  const rating = raw.overall_rating ? ` • ${raw.overall_rating.toFixed(1)}★` : "";
  const subtitle = `${duration}${rating}`;

  return {
    id: raw.hotel_id,
    type: "hotel",
    title: raw.name,
    subtitle,
    date,
    time,
    duration,
    cost: totalCost,
    currency: tripCurrency,
    status: "pending",
    details: {
      name: raw.name,
      description: raw.description || "",
      external_link: raw.external_link || "",
      lat: raw.lat?.toString() || "",
      long: raw.long?.toString() || "",
      amenities: raw.amenities?.join(", ") || "",
      photos: raw.photos?.join(", ") || "",
      overall_rating: raw.overall_rating?.toString() || "",
      datetime_check_in: raw.datetime_check_in,
      datetime_check_out: raw.datetime_check_out,
      nights: nights.toString(),
      rate_per_night: ratePerNight.toString(),
    },
  };
}

/**
 * Fetch hotel details by ID from hotel-management composite service
 * @param hotelId - The hotel UUID
 * @param tripCurrency - The trip's currency (defaults to "SGD" if not provided)
 * @returns The mapped ItineraryNode or null if fetch fails
 */
export async function fetchHotelById(hotelId: string, tripCurrency: string = "SGD"): Promise<ItineraryNode | null> {
  try {
    const response = await fetch(`/api/hotel-management/hotels/${hotelId}`);

    if (!response.ok) {
      console.warn(`Failed to fetch hotel ${hotelId}: ${response.status}`);
      return null;
    }

    const json: HotelResponse = await response.json();

    if (!json.data?.hotel) {
      console.warn(`Invalid hotel response for ${hotelId}`);
      return null;
    }

    console.log("Fetched hotel data:", json.data.hotel);
    return mapHotelToNode(json.data.hotel, tripCurrency);
  } catch (error) {
    console.error(`Error fetching hotel ${hotelId}:`, error);
    return null;
  }
}
