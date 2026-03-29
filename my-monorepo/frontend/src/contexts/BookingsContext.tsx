import { createContext, useContext, useState, type ReactNode } from "react";
import type { FlightOffer } from "@/data/flightData";
import type { HotelOffer } from "@/data/hotelData";
import type { ItineraryNode } from "@/types/trip";

export interface BookingRecord {
  id: string;
  itemType: "flight" | "hotel" | "attraction";
  title: string;
  subtitle: string;
  totalPrice: number;
  passengerCount: number;
  bookedAt: string;
  data: FlightOffer | HotelOffer | ItineraryNode;
}

interface BookingsContextType {
  bookings: BookingRecord[];
  addBooking: (booking: BookingRecord) => void;
}

const BookingsContext = createContext<BookingsContextType | undefined>(undefined);

export const BookingsProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const addBooking = (booking: BookingRecord) => {
    setBookings((prev) => [booking, ...prev]);
  };

  return (
    <BookingsContext.Provider value={{ bookings, addBooking }}>
      {children}
    </BookingsContext.Provider>
  );
};

export const useBookings = () => {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
};
