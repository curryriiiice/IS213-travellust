import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useBookings } from "@/contexts/BookingsContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Compass,
  Plane,
  Building2,
  MapPin,
  Plus,
  Trash2,
  User,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FlightOffer } from "@/data/flightData";
import type { HotelOffer } from "@/data/hotelData";
import type { AttractionOffer } from "@/data/attractionData";
import type { ItineraryNode } from "@/types/trip";

type BookingState =
  | { itemType: "flight"; data: FlightOffer }
  | { itemType: "hotel"; data: HotelOffer }
  | { itemType: "attraction"; data: AttractionOffer }
  | { itemType: "node"; data: ItineraryNode };

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passportNumber: string;
}

const emptyPassenger = (): Passenger => ({
  id: crypto.randomUUID(),
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  passportNumber: "",
});

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as BookingState | null;

  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  const [ticketCount, setTicketCount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("card");

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">No booking data found</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const itemLabel =
    state.itemType === "flight" ? "Flight"
    : state.itemType === "hotel" ? "Hotel"
    : state.itemType === "attraction" ? "Attraction"
    : "Booking";
  const itemTitle =
    state.itemType === "flight"
      ? `${state.data.origin} → ${state.data.destination}`
      : state.itemType === "hotel"
      ? state.data.name
      : state.itemType === "attraction"
      ? state.data.name
      : state.data.title;
  const unitPrice =
    state.itemType === "flight"
      ? state.data.price
      : state.itemType === "hotel"
      ? state.data.price
      : state.itemType === "attraction"
      ? state.data.price
      : state.data.cost;

  const totalPrice = unitPrice * passengers.length;

  const addPassenger = () => {
    setPassengers((prev) => [...prev, emptyPassenger()]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePassenger = (id: string, field: keyof Passenger, value: string) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const { addBooking } = useBookings();

  const handleConfirmBooking = () => {
    const incomplete = passengers.some((p) => !p.firstName || !p.lastName || !p.email);
    if (incomplete) {
      toast({
        title: "Missing information",
        description: "Please fill in at least name and email for all passengers.",
        variant: "destructive",
      });
      return;
    }

    addBooking({
      id: crypto.randomUUID(),
      itemType: state.itemType === "node" ? (state.data.type === "hotel" ? "hotel" : state.data.type === "flight" ? "flight" : "attraction") : state.itemType,
      title: itemTitle,
      subtitle: state.itemType === "flight"
        ? `${state.data.airline} · ${state.data.duration}`
        : state.itemType === "hotel"
        ? `${state.data.city} · ${state.data.starRating}★`
        : state.itemType === "attraction"
        ? `${state.data.city}, ${state.data.country} · ${state.data.category}`
        : state.data.subtitle,
      totalPrice,
      passengerCount: passengers.length,
      bookedAt: new Date().toISOString(),
      data: state.data as FlightOffer | HotelOffer | ItineraryNode,
    });

    toast({
      title: "Booking confirmed! 🎉",
      description: `${passengers.length} ticket${passengers.length > 1 ? "s" : ""} booked for ${itemTitle}. Total: $${totalPrice.toLocaleString()}`,
    });
    navigate("/bookings");
  };

  const TypeIcon = state.itemType === "flight" ? Plane : state.itemType === "hotel" ? Building2 : MapPin;
  const guestLabel = state.itemType === "hotel" ? "Guest" : state.itemType === "attraction" ? "Visitor" : "Passenger";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium tracking-tight">TravelLust</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Booking summary */}
          <div className="bg-card border border-border rounded-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent">{itemLabel} Booking</span>
            </div>
            <h1 className="text-lg font-medium tracking-tight">{itemTitle}</h1>
            {state.itemType === "flight" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {(state.data as FlightOffer).airline} · {(state.data as FlightOffer).flightNumber} · {(state.data as FlightOffer).departureTime} – {(state.data as FlightOffer).arrivalTime}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                ${unitPrice.toLocaleString()} × {passengers.length} {passengers.length > 1 ? "tickets" : "ticket"}
              </span>
              <span className="text-xl font-mono tabular-nums font-medium">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Passenger forms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">
                {guestLabel} Details
              </h2>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={addPassenger}>
                <Plus className="w-3 h-3 mr-1" /> Add {guestLabel}
              </Button>
            </div>

            {passengers.map((passenger, idx) => (
              <div key={passenger.id} className="bg-card border border-border rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {guestLabel} {idx + 1}
                  </span>
                  {passengers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removePassenger(passenger.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      placeholder="John"
                      value={passenger.firstName}
                      onChange={(e) => updatePassenger(passenger.id, "firstName", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      placeholder="Doe"
                      value={passenger.lastName}
                      onChange={(e) => updatePassenger(passenger.id, "lastName", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={passenger.email}
                      onChange={(e) => updatePassenger(passenger.id, "email", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 890"
                      value={passenger.phone}
                      onChange={(e) => updatePassenger(passenger.id, "phone", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of Birth</Label>
                    <Input
                      type="date"
                      value={passenger.dateOfBirth}
                      onChange={(e) => updatePassenger(passenger.id, "dateOfBirth", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  {state.itemType === "flight" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Passport Number</Label>
                      <Input
                        placeholder="AB1234567"
                        value={passenger.passportNumber}
                        onChange={(e) => updatePassenger(passenger.id, "passportNumber", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div className="bg-card border border-border rounded-sm p-4 mt-6 space-y-3">
            <h2 className="text-sm font-medium">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="text-sm cursor-pointer">Credit / Debit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="text-sm cursor-pointer">PayPal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="text-sm cursor-pointer">Bank Transfer</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Confirm */}
          <div className="mt-6 flex items-center justify-between bg-card border border-border rounded-sm p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <span className="text-2xl font-mono tabular-nums font-medium">${totalPrice.toLocaleString()}</span>
            </div>
            <Button variant="accent" size="lg" onClick={handleConfirmBooking}>
              <Check className="w-4 h-4 mr-1.5" /> Confirm Booking
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Booking;
