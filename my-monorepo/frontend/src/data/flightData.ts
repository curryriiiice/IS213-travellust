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
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopCities?: string[];
  aircraft: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  price: number;
  currency: string;
  seatsRemaining: number;
  baggage: string;
  co2Kg: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  cabin: string;
}

// Amadeus-style airport codes
export const airports: Record<string, string> = {
  SFO: "San Francisco",
  NRT: "Tokyo Narita",
  HND: "Tokyo Haneda",
  LAX: "Los Angeles",
  JFK: "New York JFK",
  LHR: "London Heathrow",
  CDG: "Paris CDG",
  SIN: "Singapore",
  ICN: "Seoul Incheon",
  BKK: "Bangkok",
  SYD: "Sydney",
  DXB: "Dubai",
  FRA: "Frankfurt",
  HKG: "Hong Kong",
  DEL: "New Delhi",
};

export const mockFlightResults: FlightOffer[] = [
  {
    id: "fl-001",
    airline: "Singapore Airlines",
    airlineCode: "SQ",
    flightNumber: "SQ 638",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "23:45",
    arrivalTime: "05:00+1",
    duration: "11h 15m",
    durationMinutes: 675,
    stops: 0,
    aircraft: "A350-900",
    cabin: "economy",
    price: 890,
    currency: "USD",
    seatsRemaining: 4,
    baggage: "2x 23kg",
    co2Kg: 487,
  },
  {
    id: "fl-002",
    airline: "ANA",
    airlineCode: "NH",
    flightNumber: "NH 107",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "11:30",
    arrivalTime: "15:45+1",
    duration: "10h 15m",
    durationMinutes: 615,
    stops: 0,
    aircraft: "B787-9",
    cabin: "economy",
    price: 945,
    currency: "USD",
    seatsRemaining: 12,
    baggage: "2x 23kg",
    co2Kg: 462,
  },
  {
    id: "fl-003",
    airline: "Japan Airlines",
    airlineCode: "JL",
    flightNumber: "JL 001",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "14:00",
    arrivalTime: "17:30+1",
    duration: "11h 30m",
    durationMinutes: 690,
    stops: 0,
    aircraft: "B777-300ER",
    cabin: "economy",
    price: 872,
    currency: "USD",
    seatsRemaining: 7,
    baggage: "2x 23kg",
    co2Kg: 512,
  },
  {
    id: "fl-004",
    airline: "United Airlines",
    airlineCode: "UA",
    flightNumber: "UA 837",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "13:15",
    arrivalTime: "16:50+1",
    duration: "11h 35m",
    durationMinutes: 695,
    stops: 0,
    aircraft: "B787-10",
    cabin: "economy",
    price: 765,
    currency: "USD",
    seatsRemaining: 22,
    baggage: "1x 23kg",
    co2Kg: 498,
  },
  {
    id: "fl-005",
    airline: "Korean Air",
    airlineCode: "KE",
    flightNumber: "KE 024",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "12:00",
    arrivalTime: "19:15+1",
    duration: "13h 15m",
    durationMinutes: 795,
    stops: 1,
    stopCities: ["ICN"],
    aircraft: "A380",
    cabin: "economy",
    price: 685,
    currency: "USD",
    seatsRemaining: 35,
    baggage: "1x 23kg",
    co2Kg: 578,
  },
  {
    id: "fl-006",
    airline: "Cathay Pacific",
    airlineCode: "CX",
    flightNumber: "CX 873",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "01:15",
    arrivalTime: "12:30+1",
    duration: "15h 15m",
    durationMinutes: 915,
    stops: 1,
    stopCities: ["HKG"],
    aircraft: "A350-1000",
    cabin: "economy",
    price: 628,
    currency: "USD",
    seatsRemaining: 18,
    baggage: "1x 30kg",
    co2Kg: 624,
  },
  {
    id: "fl-007",
    airline: "Singapore Airlines",
    airlineCode: "SQ",
    flightNumber: "SQ 638",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "23:45",
    arrivalTime: "05:00+1",
    duration: "11h 15m",
    durationMinutes: 675,
    stops: 0,
    aircraft: "A350-900",
    cabin: "business",
    price: 3420,
    currency: "USD",
    seatsRemaining: 2,
    baggage: "2x 32kg",
    co2Kg: 487,
  },
  {
    id: "fl-008",
    airline: "ANA",
    airlineCode: "NH",
    flightNumber: "NH 107",
    origin: "SFO",
    originCity: "San Francisco",
    destination: "NRT",
    destinationCity: "Tokyo Narita",
    departureTime: "11:30",
    arrivalTime: "15:45+1",
    duration: "10h 15m",
    durationMinutes: 615,
    stops: 0,
    aircraft: "B787-9",
    cabin: "business",
    price: 4100,
    currency: "USD",
    seatsRemaining: 1,
    baggage: "2x 32kg",
    co2Kg: 462,
  },
];
