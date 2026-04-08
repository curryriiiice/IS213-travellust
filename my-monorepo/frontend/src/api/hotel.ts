import type { ItineraryNode } from "@/types/trip";
import { parseLocalParts } from "@/lib/date-utils";

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
  const { date, time } = parseLocalParts(raw.datetime_check_in);
  const { date: checkOutDateStr } = parseLocalParts(raw.datetime_check_out);

  const checkInDate = new Date(raw.datetime_check_in);
  const checkOutDate = new Date(raw.datetime_check_out);

  // Standard hotel check-in time is already handled by parseLocalParts if provided, 
  // but if it's missing, we default to 15:00 in the UI. 
  // For hotels, the time is often secondary to the date.

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
      trip_id: raw.trip_id || "",
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
      return null;
    }

    const json: HotelResponse = await response.json();

    if (!json.data?.hotel) {
      return null;
    }

    return mapHotelToNode(json.data.hotel, tripCurrency);
  } catch (error) {
    return null;
  }
}
