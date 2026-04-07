import { describe, it, expect, beforeEach, vi } from "vitest";
import { searchFlights } from "../flightData";

// Mock the plan service response parser
vi.mock("@/api/plan", () => ({
  parsePlanResponse: vi.fn((response) => response.json()),
}));

describe("searchFlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  it("searches flights through plan service with required parameters", async () => {
    const mockFlight = {
      airline: "Singapore Airlines",
      aircraft_type: "Boeing 737",
      co2_kg: 120.5,
      currency: "SGD",
      datetime_arrival: "2026-04-15 15:00",
      datetime_departure: "2026-04-15 10:00",
      external_link: "https://www.google.com/travel/flights",
      flight_number: "SQ1",
      legroom: "32 inches",
      price_sgd: 500,
      price_usd: 370,
    };

    const mockResponse = {
      success: true,
      data: {
        flights: [mockFlight],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchFlights("SIN", "HKG", "2026-04-15");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      airline: "Singapore Airlines",
      flightNumber: "SQ1",
      price: 500,
      currency: "SGD",
      origin: "SIN",
      destination: "HKG",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/plan/flights/search",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("sends correct payload structure to plan service", async () => {
    const mockResponse = {
      success: true,
      data: {
        flights: [],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchFlights("SIN", "HKG", "2026-04-15");

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload).toMatchObject({
      origin: "SIN",
      destination: "HKG",
      datetime_departure: expect.stringContaining("T"),
      adults: 1,
      currency: "SGD",
    });
  });

  it("includes optional parameters in payload when provided", async () => {
    const mockResponse = {
      success: true,
      data: {
        flights: [],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchFlights("SIN", "HKG", "2026-04-15", {
      adults: 2,
      children: 1,
      cabin_class: "business",
      currency: "USD",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload).toMatchObject({
      adults: 2,
      children: 1,
      cabin_class: "business",
      currency: "USD",
    });
  });

  it("handles optional parameters as undefined when not provided", async () => {
    const mockResponse = {
      success: true,
      data: {
        flights: [],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchFlights("SIN", "HKG", "2026-04-15", {});

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    // Children should not be in payload if not explicitly provided
    expect(payload.children).toBeUndefined();
    expect(payload.cabin_class).toBeUndefined();
  });

  it("uses default values for currency and adults", async () => {
    const mockResponse = {
      success: true,
      data: {
        flights: [],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchFlights("SIN", "HKG", "2026-04-15");

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload.adults).toBe(1);
    expect(payload.currency).toBe("SGD");
  });

  it("handles empty flight results", async () => {
    const mockResponse = {
      success: true,
      data: {
        flights: [],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchFlights("SIN", "HKG", "2026-04-15");

    expect(results).toEqual([]);
  });

  it("handles plan service error response", async () => {
    const mockResponse = {
      success: false,
      error: "Invalid airport code",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(searchFlights("INVALID", "HKG", "2026-04-15")).rejects.toThrow(
      "Invalid airport code"
    );
  });

  it("handles HTTP error response", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
      json: async () => ({ success: false, error: "Service unavailable" }),
    });

    await expect(searchFlights("SIN", "HKG", "2026-04-15")).rejects.toThrow(
      "Service unavailable"
    );
  });

  it("handles network error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    await expect(searchFlights("SIN", "HKG", "2026-04-15")).rejects.toThrow();
  });

  it("handles malformed response from plan service", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }), // Missing flights array
    });

    const results = await searchFlights("SIN", "HKG", "2026-04-15");

    expect(results).toEqual([]);
  });

  it("maps flight data correctly to FlightOffer structure", async () => {
    const mockFlight = {
      airline: "AirAsia",
      aircraft_type: "Airbus A320",
      co2_kg: 89.2,
      currency: "SGD",
      datetime_arrival: "2026-04-15 23:25",
      datetime_departure: "2026-04-08 17:55",
      external_link: "https://www.google.com/travel/flights",
      flight_number: "1796",
      legroom: "30 inches",
      price_sgd: 250,
      price_usd: 185,
    };

    const mockResponse = {
      success: true,
      data: {
        flights: [mockFlight],
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchFlights("SIN", "HKG", "2026-04-08");

    expect(results[0]).toMatchObject({
      airline: "AirAsia",
      flightNumber: "1796",
      aircraft: "Airbus A320",
      price: 250,
      currency: "SGD",
      legroom: "30 inches",
      co2Kg: 89.2,
      externalLink: "https://www.google.com/travel/flights",
      cabin: "economy",
    });
  });

  it("handles multiple flight results", async () => {
    const mockFlights = [
      {
        airline: "Singapore Airlines",
        aircraft_type: "Boeing 737",
        co2_kg: 120.5,
        currency: "SGD",
        datetime_arrival: "2026-04-15 15:00",
        datetime_departure: "2026-04-15 10:00",
        external_link: "https://www.google.com/travel/flights",
        flight_number: "SQ1",
        legroom: "32 inches",
        price_sgd: 500,
        price_usd: 370,
      },
      {
        airline: "Cathay Pacific",
        aircraft_type: "Airbus A350",
        co2_kg: 145.8,
        currency: "SGD",
        datetime_arrival: "2026-04-15 18:30",
        datetime_departure: "2026-04-15 13:00",
        external_link: "https://www.google.com/travel/flights",
        flight_number: "CX720",
        legroom: "33 inches",
        price_sgd: 450,
        price_usd: 335,
      },
    ];

    const mockResponse = {
      success: true,
      data: {
        flights: mockFlights,
        search_metadata: {},
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchFlights("SIN", "HKG", "2026-04-15");

    expect(results).toHaveLength(2);
    expect(results[0].airline).toBe("Singapore Airlines");
    expect(results[1].airline).toBe("Cathay Pacific");
  });
});