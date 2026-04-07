import { parsePlanResponse } from "@/api/plan";
import { handleApiError, retryWithBackoff } from "@/utils/apiErrorHandler";

export interface HotelOffer {
  id: string;
  name: string;
  chain: string;
  city: string;
  address: string;
  starRating: number;
  overall_rating: number;
  reviews: number;
  price: number;
  currency: string;
  roomType: string;
  amenities: string[];
  thumbnail: string;
  fallbackThumbnail?: string;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  distanceFromCenter: string;
  locationRating?: number;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

// Plan service response interface for hotel search
interface HotelPlanResponse {
  search_results: {
    properties: any[];
  };
  status: string;
}

export const hotelCities: Record<string, string> = {
  tokyo: "Tokyo, Japan",
  paris: "Paris, France",
  london: "London, UK",
  new_york: "New York, USA",
  singapore: "Singapore",
  dubai: "Dubai, UAE",
  sydney: "Sydney, Australia",
  bangkok: "Bangkok, Thailand",
  seoul: "Seoul, South Korea",
  san_francisco: "San Francisco, USA",
};

export const mockHotelResults: HotelOffer[] = [
  {
    id: "ht-001",
    name: "Park Hyatt Tokyo",
    chain: "Hyatt",
    city: "Tokyo",
    address: "3-7-1-2 Nishi Shinjuku, Shinjuku",
    starRating: 5,
    overall_rating: 9.4,
    reviews: 2847,
    price: 485,
    currency: "USD",
    roomType: "Deluxe King",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Concierge"],
    thumbnail: "luxury-tower",
    freeCancellation: true,
    breakfastIncluded: false,
    distanceFromCenter: "0.8 km",
  },
  {
    id: "ht-002",
    name: "Aman Tokyo",
    chain: "Aman",
    city: "Tokyo",
    address: "1-5-6 Otemachi, Chiyoda",
    starRating: 5,
    overall_rating: 9.7,
    reviews: 1203,
    price: 1120,
    currency: "USD",
    roomType: "Premier Room",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Onsen"],
    thumbnail: "zen-luxury",
    freeCancellation: true,
    breakfastIncluded: true,
    distanceFromCenter: "0.2 km",
  },
  {
    id: "ht-003",
    name: "Hotel Gracery Shinjuku",
    chain: "Gracery",
    city: "Tokyo",
    address: "1-19-1 Kabukicho, Shinjuku",
    starRating: 3,
    overall_rating: 8.1,
    reviews: 5621,
    price: 112,
    currency: "USD",
    roomType: "Standard Double",
    amenities: ["Restaurant", "WiFi", "Laundry"],
    thumbnail: "city-hotel",
    freeCancellation: false,
    breakfastIncluded: false,
    distanceFromCenter: "1.2 km",
  },
  {
    id: "ht-004",
    name: "Andaz Tokyo Toranomon Hills",
    chain: "Hyatt",
    city: "Tokyo",
    address: "1-23-4 Toranomon, Minato",
    starRating: 5,
    overall_rating: 9.2,
    reviews: 1876,
    price: 395,
    currency: "USD",
    roomType: "Andaz Large King",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Rooftop"],
    thumbnail: "modern-luxury",
    freeCancellation: true,
    breakfastIncluded: true,
    distanceFromCenter: "1.5 km",
  },
  {
    id: "ht-005",
    name: "Shinjuku Granbell Hotel",
    chain: "Granbell",
    city: "Tokyo",
    address: "2-14-5 Kabukicho, Shinjuku",
    starRating: 3,
    overall_rating: 7.8,
    reviews: 3412,
    price: 89,
    currency: "USD",
    roomType: "Superior Double",
    amenities: ["WiFi", "Restaurant", "Terrace"],
    thumbnail: "boutique",
    freeCancellation: false,
    breakfastIncluded: false,
    distanceFromCenter: "1.0 km",
  },
  {
    id: "ht-006",
    name: "The Peninsula Tokyo",
    chain: "Peninsula",
    city: "Tokyo",
    address: "1-8-1 Yurakucho, Chiyoda",
    starRating: 5,
    overall_rating: 9.5,
    reviews: 2105,
    price: 620,
    currency: "USD",
    roomType: "Deluxe Room",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Limo Service"],
    thumbnail: "grand-hotel",
    freeCancellation: true,
    breakfastIncluded: true,
    distanceFromCenter: "0.3 km",
  },
  {
    id: "ht-007",
    name: "MUJI Hotel Ginza",
    chain: "MUJI",
    city: "Tokyo",
    address: "3-3-5 Ginza, Chuo",
    starRating: 4,
    overall_rating: 8.6,
    reviews: 1567,
    price: 198,
    currency: "USD",
    roomType: "Type C Double",
    amenities: ["Restaurant", "WiFi", "MUJI Store"],
    thumbnail: "minimal-design",
    freeCancellation: true,
    breakfastIncluded: false,
    distanceFromCenter: "0.5 km",
  },
  {
    id: "ht-008",
    name: "Dormy Inn Premium Shibuya",
    chain: "Dormy Inn",
    city: "Tokyo",
    address: "2-19-1 Dogenzaka, Shibuya",
    starRating: 3,
    overall_rating: 8.4,
    reviews: 4230,
    price: 135,
    currency: "USD",
    roomType: "Queen Room",
    amenities: ["Onsen", "WiFi", "Laundry", "Free Ramen"],
    thumbnail: "business-hotel",
    freeCancellation: false,
    breakfastIncluded: true,
    distanceFromCenter: "2.1 km",
  },
];

/**
 * Search for hotels using the plan service gateway.
 *
 * This function routes search requests through the plan service for consistent
 * error handling and future extensibility. The plan service validates requests
 * and forwards to the hotel-management service.
 *
 * Features:
 * - Automatic retry logic for transient errors (network issues, timeouts, server errors)
 * - Standardized error handling with user-friendly messages
 * - Support for optional search parameters (children, currency, language, sorting, rating)
 * - Exponential backoff for retries (1s, 2s delays)
 * - Filters out invalid results (price <= 0 or reviews <= 0)
 *
 * @param query - Search query (e.g., "Tokyo, Japan" or "Singapore")
 * @param checkInDate - Check-in date in YYYY-MM-DD format
 * @param checkOutDate - Check-out date in YYYY-MM-DD format
 * @param adults - Number of adult passengers (default: 2)
 * @param options - Optional search parameters
 * @param options.children - Number of child passengers (default: 0)
 * @param options.currency - Currency for pricing (default: "SGD")
 * @param options.hl - Language code (default: "en")
 * @param options.sort_by - Sort option: 3=price, 8=rating, 13=reviews (optional)
 * @param options.rating - Minimum rating: 7=3.5+, 8=4.0+, 9=4.5+ (optional)
 * @returns Promise<HotelOffer[]> - Array of hotel search results
 * @throws {Error} - For validation, network, or server errors with user-friendly messages
 *
 * @example
 * // Basic hotel search
 * const hotels = await searchHotels("Tokyo, Japan", "2026-04-15", "2026-04-17", 2);
 *
 * @example
 * // Hotel search with options
 * const hotels = await searchHotels("Paris, France", "2026-04-15", "2026-04-17", 2, {
 *   children: 1,
 *   currency: "EUR",
 *   sort_by: 8,
 *   rating: 8
 * });
 */
export async function searchHotels(
  query: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2,
  options?: {
    children?: number;
    currency?: string;
    hl?: string;
    sort_by?: number;
    rating?: number;
  }
): Promise<HotelOffer[]> {
  return retryWithBackoff(async () => {
    const payload = {
      query,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      adults,
      currency: options?.currency ?? "SGD",
      children: options?.children ?? 0,
      hl: options?.hl ?? "en",
      ...(options?.sort_by !== undefined && { sort_by: options.sort_by }),
      ...(options?.rating !== undefined && { rating: options.rating }),
    };

    const response = await fetch("/api/plan/hotels/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await parsePlanResponse<HotelPlanResponse>(response);
    if (!response.ok || !json.success) {
      const error = await handleApiError({ response, message: json.error }, "hotel search");
      throw new Error(error.message);
    }

    const properties = json.data?.search_results?.properties || [];

    return properties.map((p: any) => {
      let nearbyText = "";
      if (p.nearby_places && p.nearby_places.length > 0) {
        const place = p.nearby_places[0];
        const transport = place.transportations?.[0];
        if (transport) {
          nearbyText = `${transport.duration} ${transport.type === 'Walking' ? 'walk' : transport.type.toLowerCase()} to ${place.name}`;
        } else {
          nearbyText = `Near ${place.name}`;
        }
      }

      return {
        id: p.property_token || Math.random().toString(),
        name: p.name || "",
        chain: "",
        city: query,
        // Provide a mocked address if unavailable or try to get it from gps coordinates
        address: p.address || "",
        // Base 5. If overall_rating is out of 10, maybe we divide by 2? SerpApi usually returns out of 5 for Google Hotels.
        starRating: Math.round(p.overall_rating || 3),
        overall_rating: Math.round((p.overall_rating || 0) * 10) / 10,
        reviews: p.reviews || 0,
        price: p.rate_per_night?.extracted_lowest || p.total_rate?.extracted_lowest || 0,
        currency: "SGD", // The payload asks for SGD or it usually is SGD
        roomType: "Standard Room",
        amenities: p.amenities || [],
        thumbnail: p.images?.[0]?.original_image || p.images?.[0]?.thumbnail || "",
        fallbackThumbnail: p.images?.[0]?.thumbnail || "",
        freeCancellation: p.amenities?.some((a: string) => a.toLowerCase().includes("cancellation")) || false,
        breakfastIncluded: p.amenities?.some((a: string) => a.toLowerCase().includes("breakfast")) || false,
        distanceFromCenter: nearbyText,
        locationRating: Math.round((p.location_rating || 0) * 10) / 10,
      };
    }).filter((h: HotelOffer) => h.price > 0 && h.reviews > 0);
  }, 2, 1000); // maxRetries: 2, baseDelay: 1000ms
}
