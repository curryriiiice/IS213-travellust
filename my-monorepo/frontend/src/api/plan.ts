import type { FlightOffer } from "@/data/flightData";
import type { HotelOffer } from "@/data/hotelData";
import type { AttractionOffer } from "@/data/attractionData";

type PlanApiResponse<T> = {
  success?: boolean;
  error?: string;
  data?: T;
};

export type AttractionPlanInput = {
  name?: string;
  location?: string;
  gmapsLink?: string;
  visitDate: string;
  visitTime: string;
  durationMinutes: number;
  cost: number | string;
  status?: "pending" | "confirmed" | "added";
};

/** Build a full ISO datetime string from a date (YYYY-MM-DD) and a time (HH:MM). */
function toISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/** Calculate arrival datetime by adding durationMinutes to departure. */
function arrivalISO(departureISO: string, durationMinutes: number): string {
  const ms = new Date(departureISO).getTime() + durationMinutes * 60_000;
  return new Date(ms).toISOString().slice(0, 19);
}

async function parsePlanResponse<T>(res: Response): Promise<PlanApiResponse<T>> {
  const raw = await res.text();

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as PlanApiResponse<T>;
  } catch {
    throw new Error(
      `Plan service returned a non-JSON response (${res.status}).`
    );
  }
}

function buildAttractionDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export async function saveFlight(
  tripId: string,
  userId: string,
  flight: FlightOffer,
  searchDate: string // YYYY-MM-DD
): Promise<{ flight_id: string }> {
  const datetimeDeparture = toISO(searchDate, flight.departureTime);
  const datetimeArrival = arrivalISO(datetimeDeparture, flight.durationMinutes);

  const body = {
    trip_id: tripId,
    user_id: userId,
    cost: flight.price,
    flight_details: {
      airline: flight.airline,
      flight_number: flight.flightNumber,
      datetime_departure: datetimeDeparture,
      datetime_arrival: datetimeArrival,
      origin: flight.origin,
      destination: flight.destination,
      aircraft_type: flight.aircraft,
      legroom: flight.legroom,
      co2_kg: flight.co2Kg,
      external_link: flight.externalLink,
      currency: flight.currency,
    },
  };

  const res = await fetch("/api/plan/flights/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await parsePlanResponse<{ flight_id: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan service is running.`
          : "Failed to save flight")
    );
  }
  return json.data;
}

export async function saveHotel(
  tripId: string,
  userId: string,
  hotel: HotelOffer,
  checkIn: string,  // YYYY-MM-DD
  checkOut: string  // YYYY-MM-DD
): Promise<{ hotel_id: string }> {
  const body = {
    trip_id: tripId,
    user_id: userId,
    hotel: {
      name: hotel.name,
      check_in_date: checkIn,
      check_out_date: checkOut,
      description: hotel.roomType,
      overall_rating: hotel.overall_rating,
      rate_per_night: hotel.price,
      address: hotel.address,
      amenities: hotel.amenities,
      photos: hotel.thumbnail ? [hotel.thumbnail] : [],
    },
  };

  const res = await fetch("/api/plan/hotels/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await parsePlanResponse<{ hotel_id: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan service is running.`
          : "Failed to save hotel")
    );
  }
  return json.data?.hotel ?? json.data;
}

export async function saveAttraction(
  tripId: string,
  userId: string,
  attraction: AttractionOffer,
  visitDate: string // YYYY-MM-DD, used as visit_time date part
): Promise<{ attraction_id: string }> {
  return saveCatalogAttraction(tripId, userId, attraction, {
    visitDate,
    visitTime: "09:00",
    durationMinutes: attraction.durationMinutes,
    cost: String(attraction.price),
  });
}

export async function saveCatalogAttraction(
  tripId: string,
  userId: string,
  attraction: AttractionOffer,
  input: AttractionPlanInput
): Promise<{ attraction_id: string }> {
  const body = {
    trip_id: tripId,
    user_id: userId,
    attraction: {
      catalog_attraction_id: attraction.id,
      visit_time: buildAttractionDateTime(input.visitDate, input.visitTime),
      duration_minutes: input.durationMinutes,
      cost: String(input.cost),
      ...(input.status ? { status: input.status } : {}),
    },
  };

  const res = await fetch("/api/plan/attractions/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await parsePlanResponse<{ attraction_id: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan, trips, and attractions services are running.`
          : "Failed to save attraction")
    );
  }
  return json.data;
}

export async function saveManualAttraction(
  tripId: string,
  userId: string,
  input: AttractionPlanInput
): Promise<{ attraction_id: string }> {
  const body = {
    trip_id: tripId,
    user_id: userId,
    attraction: {
      name: input.name,
      location: input.location,
      gmaps_link: input.gmapsLink,
      visit_time: buildAttractionDateTime(input.visitDate, input.visitTime),
      duration_minutes: input.durationMinutes,
      cost: String(input.cost),
      ...(input.status ? { status: input.status } : {}),
    },
  };

  const res = await fetch("/api/plan/attractions/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await parsePlanResponse<{ attraction_id: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan, trips, and attractions services are running.`
          : "Failed to save attraction")
    );
  }
  return json.data;
}

export async function updatePlannedAttraction(
  tripId: string,
  userId: string,
  attractionId: string,
  input: AttractionPlanInput
): Promise<{ attraction_id: string }> {
  const body = {
    trip_id: tripId,
    user_id: userId,
    attraction_id: attractionId,
    attraction: {
      name: input.name,
      location: input.location,
      gmaps_link: input.gmapsLink,
      visit_time: buildAttractionDateTime(input.visitDate, input.visitTime),
      duration_minutes: input.durationMinutes,
      cost: String(input.cost),
      ...(input.status ? { status: input.status } : {}),
    },
  };

  const res = await fetch("/api/plan/attractions/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await parsePlanResponse<{ attraction_id: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan, trips, and attractions services are running.`
          : "Failed to update attraction")
    );
  }
  return json.data;
}

export async function deletePlannedAttraction(
  tripId: string,
  userId: string,
  attractionId: string
): Promise<{ message?: string }> {
  const res = await fetch("/api/plan/attractions/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_id: tripId,
      user_id: userId,
      attraction_id: attractionId,
    }),
  });

  const json = await parsePlanResponse<{ message?: string }>(res);
  if (!res.ok || !json.success) {
    throw new Error(
      json.error ??
        (Object.keys(json).length === 0
          ? `Plan service returned an empty response (${res.status}). Check that the plan, trips, and attractions services are running.`
          : "Failed to delete attraction")
    );
  }
  return json.data ?? {};
}
