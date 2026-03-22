export interface HotelOffer {
  id: string;
  name: string;
  chain: string;
  city: string;
  address: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  pricePerNight: number;
  currency: string;
  roomType: string;
  amenities: string[];
  imageTag: string; // descriptor for UI placeholder
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  distanceFromCenter: string;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
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
    guestRating: 9.4,
    reviewCount: 2847,
    pricePerNight: 485,
    currency: "USD",
    roomType: "Deluxe King",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Concierge"],
    imageTag: "luxury-tower",
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
    guestRating: 9.7,
    reviewCount: 1203,
    pricePerNight: 1120,
    currency: "USD",
    roomType: "Premier Room",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Onsen"],
    imageTag: "zen-luxury",
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
    guestRating: 8.1,
    reviewCount: 5621,
    pricePerNight: 112,
    currency: "USD",
    roomType: "Standard Double",
    amenities: ["Restaurant", "WiFi", "Laundry"],
    imageTag: "city-hotel",
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
    guestRating: 9.2,
    reviewCount: 1876,
    pricePerNight: 395,
    currency: "USD",
    roomType: "Andaz Large King",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Rooftop"],
    imageTag: "modern-luxury",
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
    guestRating: 7.8,
    reviewCount: 3412,
    pricePerNight: 89,
    currency: "USD",
    roomType: "Superior Double",
    amenities: ["WiFi", "Restaurant", "Terrace"],
    imageTag: "boutique",
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
    guestRating: 9.5,
    reviewCount: 2105,
    pricePerNight: 620,
    currency: "USD",
    roomType: "Deluxe Room",
    amenities: ["Spa", "Pool", "Gym", "Restaurant", "Bar", "Limo Service"],
    imageTag: "grand-hotel",
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
    guestRating: 8.6,
    reviewCount: 1567,
    pricePerNight: 198,
    currency: "USD",
    roomType: "Type C Double",
    amenities: ["Restaurant", "WiFi", "MUJI Store"],
    imageTag: "minimal-design",
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
    guestRating: 8.4,
    reviewCount: 4230,
    pricePerNight: 135,
    currency: "USD",
    roomType: "Queen Room",
    amenities: ["Onsen", "WiFi", "Laundry", "Free Ramen"],
    imageTag: "business-hotel",
    freeCancellation: false,
    breakfastIncluded: true,
    distanceFromCenter: "2.1 km",
  },
];
