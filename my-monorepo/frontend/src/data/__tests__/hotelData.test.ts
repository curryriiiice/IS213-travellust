import { describe, it, expect, beforeEach, vi } from "vitest";
import { searchHotels } from "../hotelData";

// Mock the plan service response parser
vi.mock("@/api/plan", () => ({
  parsePlanResponse: vi.fn((response) => response.json()),
}));

describe("searchHotels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  it("searches hotels through plan service with required parameters", async () => {
    const mockProperty = {
      name: "Marina Bay Sands",
      address: "10 Bayfront Ave, Singapore 018956",
      overall_rating: 4.8,
      reviews: 1250,
      rate_per_night: {
        extracted_lowest: 450,
      },
      total_rate: {
        extracted_lowest: 900,
      },
      amenities: ["Pool", "WiFi", "Gym", "Spa"],
      images: [
        {
          original_image: "https://example.com/image1.jpg",
          thumbnail: "https://example.com/thumb1.jpg",
        },
      ],
      property_token: "hotel-123",
      nearby_places: [],
      location_rating: 4.9,
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "Marina Bay Sands",
      city: "Singapore",
      address: "10 Bayfront Ave, Singapore 018956",
      starRating: 5,
      overall_rating: 4.8,
      reviews: 1250,
      price: 450,
      currency: "SGD",
      roomType: "Standard Room",
      amenities: ["Pool", "WiFi", "Gym", "Spa"],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/plan/hotels/search",
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
        search_results: {
          properties: [],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchHotels("Tokyo, Japan", "2026-04-15", "2026-04-17", 2);

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload).toMatchObject({
      query: "Tokyo, Japan",
      check_in_date: "2026-04-15",
      check_out_date: "2026-04-17",
      adults: 2,
      currency: "SGD",
      children: 0,
      hl: "en",
    });
  });

  it("includes optional parameters in payload when provided", async () => {
    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchHotels("Paris, France", "2026-04-15", "2026-04-17", 2, {
      children: 2,
      currency: "EUR",
      hl: "fr",
      sort_by: 8,
      rating: 8,
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload).toMatchObject({
      children: 2,
      currency: "EUR",
      hl: "fr",
      sort_by: 8,
      rating: 8,
    });
  });

  it("uses default values for optional parameters when not provided", async () => {
    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2, {});

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload).toMatchObject({
      currency: "SGD",
      children: 0,
      hl: "en",
    });
    // sort_by and rating should not be in payload if not explicitly provided
    expect(payload.sort_by).toBeUndefined();
    expect(payload.rating).toBeUndefined();
  });

  it("filters out properties with zero price", async () => {
    const mockProperties = [
      {
        name: "Valid Hotel",
        overall_rating: 4.5,
        reviews: 100,
        rate_per_night: { extracted_lowest: 200 },
        amenities: [],
        images: [],
      },
      {
        name: "Invalid Price Hotel",
        overall_rating: 4.0,
        reviews: 50,
        rate_per_night: { extracted_lowest: 0 }, // Invalid: zero price
        amenities: [],
        images: [],
      },
    ];

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: mockProperties,
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Valid Hotel");
  });

  it("filters out properties with zero reviews", async () => {
    const mockProperties = [
      {
        name: "Valid Hotel",
        overall_rating: 4.5,
        reviews: 100,
        rate_per_night: { extracted_lowest: 200 },
        amenities: [],
        images: [],
      },
      {
        name: "No Reviews Hotel",
        overall_rating: 4.0,
        reviews: 0, // Invalid: zero reviews
        rate_per_night: { extracted_lowest: 150 },
        amenities: [],
        images: [],
      },
    ];

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: mockProperties,
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Valid Hotel");
  });

  it("handles empty hotel results", async () => {
    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results).toEqual([]);
  });

  it("handles plan service error response", async () => {
    const mockResponse = {
      success: false,
      error: "Invalid date range",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      searchHotels("Singapore", "2026-04-15", "2026-04-17", 2)
    ).rejects.toThrow("Invalid date range");
  });

  it("handles HTTP error response", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ success: false, error: "Invalid query" }),
    });

    await expect(
      searchHotels("Singapore", "2026-04-15", "2026-04-17", 2)
    ).rejects.toThrow("Invalid query");
  });

  it("handles network error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    await expect(
      searchHotels("Singapore", "2026-04-15", "2026-04-17", 2)
    ).rejects.toThrow();
  });

  it("handles malformed response from plan service", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }), // Missing search_results
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results).toEqual([]);
  });

  it("maps hotel data correctly to HotelOffer structure", async () => {
    const mockProperty = {
      name: "Park Hyatt Tokyo",
      address: "3-7-1-2 Nishi Shinjuku, Shinjuku",
      overall_rating: 4.9,
      reviews: 2847,
      rate_per_night: {
        extracted_lowest: 485,
      },
      amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Concierge"],
      images: [
        {
          original_image: "https://example.com/park-hyatt.jpg",
          thumbnail: "https://example.com/park-hyatt-thumb.jpg",
        },
      ],
      property_token: "park-hyatt-tokyo",
      nearby_places: [
        {
          name: "Tokyo Tower",
          transportations: [
            {
              type: "Walking",
              duration: "15 min",
            },
          ],
        },
      ],
      location_rating: 4.8,
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Tokyo", "2026-04-15", "2026-04-17", 2);

    expect(results[0]).toMatchObject({
      name: "Park Hyatt Tokyo",
      city: "Tokyo",
      address: "3-7-1-2 Nishi Shinjuku, Shinjuku",
      starRating: 5,
      overall_rating: 4.9,
      reviews: 2847,
      price: 485,
      currency: "SGD",
      roomType: "Standard Room",
      amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Concierge"],
      thumbnail: "https://example.com/park-hyatt.jpg",
      fallbackThumbnail: "https://example.com/park-hyatt-thumb.jpg",
      distanceFromCenter: "15 min walk to Tokyo Tower",
      locationRating: 4.8,
    });
  });

  it("handles properties with total_rate instead of rate_per_night", async () => {
    const mockProperty = {
      name: "Budget Hotel",
      overall_rating: 4.2,
      reviews: 500,
      total_rate: {
        extracted_lowest: 300,
      },
      amenities: ["WiFi"],
      images: [],
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results[0].price).toBe(300);
  });

  it("handles properties without nearby places", async () => {
    const mockProperty = {
      name: "Hotel Without Nearby",
      overall_rating: 4.3,
      reviews: 200,
      rate_per_night: {
        extracted_lowest: 150,
      },
      amenities: [],
      images: [],
      // No nearby_places field
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results[0].distanceFromCenter).toBe("");
  });

  it("detects free cancellation from amenities", async () => {
    const mockProperty = {
      name: "Flexible Hotel",
      overall_rating: 4.5,
      reviews: 300,
      rate_per_night: {
        extracted_lowest: 200,
      },
      amenities: ["WiFi", "Pool", "Free Cancellation"],
      images: [],
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results[0].freeCancellation).toBe(true);
  });

  it("detects breakfast included from amenities", async () => {
    const mockProperty = {
      name: "Breakfast Included Hotel",
      overall_rating: 4.6,
      reviews: 400,
      rate_per_night: {
        extracted_lowest: 250,
      },
      amenities: ["WiFi", "Breakfast Included"],
      images: [],
    };

    const mockResponse = {
      success: true,
      data: {
        search_results: {
          properties: [mockProperty],
        },
        status: "success",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await searchHotels("Singapore", "2026-04-15", "2026-04-17", 2);

    expect(results[0].breakfastIncluded).toBe(true);
  });
});