import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Compass,
  Plane,
  Building2,
  MapPin,
  Star,
  Leaf,
  Coffee,
  Clock,
  Shield,
  Check,
  Plus,
  User,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FlightOffer } from "@/data/flightData";
import type { HotelOffer } from "@/data/hotelData";
import type { AttractionOffer } from "@/data/attractionData";
import type { ItineraryNode } from "@/types/trip";
import { bookFlight } from "@/api/booking";

const MAIN_USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

type ItemState =
  | { itemType: "flight"; data: FlightOffer }
  | { itemType: "hotel"; data: HotelOffer }
  | { itemType: "attraction"; data: AttractionOffer }
  | { itemType: "node"; data: ItineraryNode; tripId?: string; memberIds?: string[] };

const ItemDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as (ItemState & { fromBookings?: boolean }) | null;

  // Passenger selection modal state
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">No item data found</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  // For non-node items, navigate to the booking flow
  const handleBookGeneric = () => {
    navigate("/booking", { state });
  };

  // For node-type flight items: open passenger selection modal
  const handleBookFlight = () => {
    if (state.itemType !== "node") return;
    const memberIds = (state as { memberIds?: string[] }).memberIds ?? [];
    // Pre-select main user if they are in the list
    const initialSelection = memberIds.includes(MAIN_USER_ID)
      ? [MAIN_USER_ID]
      : [];
    setSelectedUserIds(initialSelection);
    setIsPassengerModalOpen(true);
  };

  const togglePassenger = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleConfirmBooking = async () => {
    if (state.itemType !== "node") return;
    const nodeState = state as {
      data: ItineraryNode;
      tripId?: string;
      memberIds?: string[];
    };

    const tripId = nodeState.tripId;
    const flightId = nodeState.data.id;

    if (!tripId) {
      toast({
        title: "Booking Failed",
        description: "Trip ID is missing. Please navigate from a trip.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUserIds.length === 0) {
      toast({
        title: "No Passengers Selected",
        description: "Please select at least one passenger.",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      await bookFlight(tripId, MAIN_USER_ID, selectedUserIds, flightId);
      setIsPassengerModalOpen(false);
      toast({
        title: "✈️ Booking Successful",
        description: `Flight booked for ${selectedUserIds.length} passenger${selectedUserIds.length > 1 ? "s" : ""}. Status updated to Confirmed.`,
      });
      // Patch node status locally to "confirmed" — navigate back so Index refreshes
      // (the backend has persisted the booking; the user can re-open the trip to see the sync)
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Booking Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Determine what "onBook" means per item type
  const isNodeFlight =
    state.itemType === "node" && (state as { data: ItineraryNode }).data.type === "flight";

  const onBook = state.fromBookings
    ? undefined
    : isNodeFlight
    ? handleBookFlight
    : handleBookGeneric;

  // Member IDs for modal
  const memberIds =
    state.itemType === "node"
      ? ((state as { memberIds?: string[] }).memberIds ?? [])
      : [];

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
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {state.itemType === "flight" && <FlightDetail flight={state.data} onBook={onBook} />}
        {state.itemType === "hotel" && <HotelDetail hotel={state.data} onBook={onBook} />}
        {state.itemType === "attraction" && <AttractionDetail attraction={state.data} onBook={onBook} />}
        {state.itemType === "node" && <NodeDetail node={state.data} onBook={onBook} />}
      </div>

      {/* Passenger Selection Modal */}
      <Dialog open={isPassengerModalOpen} onOpenChange={setIsPassengerModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-accent" />
              Select Passengers
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-mono">
              Choose which trip members to book tickets for.
            </p>

            {memberIds.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  No member IDs found for this trip.
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Main user ID will be used: {MAIN_USER_ID.slice(0, 8)}…
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {memberIds.map((uid) => {
                  const isSelected = selectedUserIds.includes(uid);
                  const isMainUser = uid === MAIN_USER_ID;
                  return (
                    <button
                      key={uid}
                      onClick={() => togglePassenger(uid)}
                      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-sm transition-all border ${
                        isSelected
                          ? "bg-accent/10 border-accent/40 text-foreground"
                          : "border-transparent hover:bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-accent border-accent"
                            : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-mono break-all">{uid}</p>
                        {isMainUser && (
                          <p className="text-[10px] text-accent font-mono">you · main user</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">
                {selectedUserIds.length} passenger{selectedUserIds.length !== 1 ? "s" : ""} selected
              </span>
              {memberIds.length === 0 && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  Will use main user by default
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPassengerModalOpen(false)}
              disabled={isBooking}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleConfirmBooking}
              disabled={isBooking || (memberIds.length > 0 && selectedUserIds.length === 0)}
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Booking…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Confirm Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FlightDetail({ flight, onBook }: { flight: FlightOffer; onBook?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Hero */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="bg-accent/10 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent">Flight</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight">
            {flight.origin} → {flight.destination}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {flight.airline} · {flight.flightNumber}
          </p>
        </div>

        {/* Route visual */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <p className="text-2xl font-mono tabular-nums font-medium">{flight.departureTime}</p>
              <p className="text-sm text-muted-foreground font-mono">{flight.origin}</p>
              <p className="text-xs text-muted-foreground">{flight.originCity}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 px-6">
              <span className="text-xs text-muted-foreground font-mono">{flight.duration}</span>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px bg-border" />
                <Plane className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Direct
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono tabular-nums font-medium">{flight.arrivalTime}</p>
              <p className="text-sm text-muted-foreground font-mono">{flight.destination}</p>
              <p className="text-xs text-muted-foreground">{flight.destinationCity}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-t border-border">
            <InfoBlock icon={Plane} label="Aircraft" value={flight.aircraft} />
            <InfoBlock icon={Shield} label="Cabin" value={flight.cabin.replace("_", " ")} />
            <InfoBlock icon={User} label="Legroom" value={flight.legroom} />
          </div>

          <div className="flex items-center gap-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono"><Leaf className="w-3 h-3" /> {flight.co2Kg}kg CO₂</span>
          </div>
        </div>

        {onBook && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-2xl font-mono tabular-nums font-medium">${flight.price.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground ml-1.5">per person</span>
            </div>
            <Button variant="accent" size="lg" onClick={onBook}>
              <Plus className="w-4 h-4 mr-1.5" /> Add to Trip
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HotelDetail({ hotel, onBook }: { hotel: HotelOffer; onBook?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {/* Hero image placeholder or actual image */}
        <div className="aspect-video bg-secondary flex items-center justify-center border-b border-border overflow-hidden relative">
          {hotel.thumbnail ? (
            <img
              src={hotel.thumbnail}
              alt={hotel.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (hotel.fallbackThumbnail && target.src !== hotel.fallbackThumbnail && !target.src.includes(hotel.fallbackThumbnail)) {
                  target.src = hotel.fallbackThumbnail;
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          ) : (
            <Building2 className="w-16 h-16 text-muted-foreground/20" />
          )}
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-node-hotel" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-node-hotel">Hotel</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight">{hotel.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-node-hotel">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-base font-mono font-medium">{hotel.overall_rating > 0 ? hotel.overall_rating : "N/A"}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2 border-l border-border pl-2">
              {hotel.reviews?.toLocaleString() || 0} reviews
            </span>
            {hotel.chain && (
              <span className="text-xs text-muted-foreground font-mono ml-2 border-l border-border pl-2">
                {hotel.chain}
              </span>
            )}
          </div>
          {hotel.distanceFromCenter && (
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1.5 ">
                <MapPin className="w-3.5 h-3.5 block" />
                <span className="text-xs font-mono">{hotel.distanceFromCenter}</span>
              </div>
              {hotel.locationRating && hotel.locationRating > 0 && (
                <div className="flex items-center gap-1.5 border-l border-border pl-4">
                  <span className="text-xs font-mono">Location Rating: <span className="text-foreground font-medium">{hotel.locationRating}/5</span></span>
                </div>
              )}
            </div>
          )}

          {hotel.address && (
            <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{hotel.address}</span>
            </div>
          )}

          {/* Amenities */}
          <div className="mt-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-2">Amenities</span>
            <div className="flex flex-wrap gap-1.5">
              {hotel.amenities.map((a) => (
                <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
              ))}
            </div>
          </div>

          {/* Perks */}
          <div className="flex items-center gap-4 mt-4 py-3 border-t border-border">
            {hotel.freeCancellation && (
              <span className="text-xs text-node-hotel font-mono flex items-center gap-1">
                <Shield className="w-3 h-3" /> Free Cancellation
              </span>
            )}
            {hotel.breakfastIncluded && (
              <span className="text-xs text-node-attraction font-mono flex items-center gap-1">
                <Coffee className="w-3 h-3" /> Breakfast Included
              </span>
            )}
          </div>
        </div>

        {onBook && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-2xl font-mono tabular-nums font-medium">${hotel.price}</span>
              <span className="text-sm text-muted-foreground ml-1.5">per night</span>
            </div>
            <Button variant="accent" size="lg" onClick={onBook}>
              <Plus className="w-4 h-4 mr-1.5" /> Add to Trip
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AttractionDetail({ attraction, onBook }: { attraction: AttractionOffer; onBook?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="h-48 bg-secondary flex items-center justify-center border-b border-border">
          <MapPin className="w-16 h-16 text-muted-foreground/20" />
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-node-attraction" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-node-attraction">Attraction</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight">{attraction.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-node-attraction/30 text-node-attraction">
              {attraction.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-node-hotel/30 text-node-hotel">
              ★ {attraction.rating}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">{attraction.reviewCount.toLocaleString()} reviews</span>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{attraction.address}</span>
          </div>

          <p className="text-sm text-muted-foreground mt-3">{attraction.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 py-4 border-t border-border">
            <InfoBlock icon={Clock} label="Duration" value={
              attraction.durationMinutes >= 60
                ? `${Math.floor(attraction.durationMinutes / 60)}h${attraction.durationMinutes % 60 > 0 ? ` ${attraction.durationMinutes % 60}m` : ""}`
                : `${attraction.durationMinutes}m`
            } />
            <InfoBlock icon={Clock} label="Opening Hours" value={attraction.openingHours} />
            <InfoBlock icon={MapPin} label="City" value={`${attraction.city}, ${attraction.country}`} />
          </div>
        </div>

        {onBook && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-2xl font-mono tabular-nums font-medium">
                {attraction.price === 0 ? "Free" : `$${attraction.price}`}
              </span>
              {attraction.price > 0 && <span className="text-sm text-muted-foreground ml-1.5">per person</span>}
            </div>
            <Button variant="accent" size="lg" onClick={onBook}>
              <Plus className="w-4 h-4 mr-1.5" /> Add to Trip
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NodeDetail({ node, onBook }: { node: ItineraryNode; onBook?: () => void }) {
  const typeConfig = {
    flight: { icon: Plane, color: "text-accent", label: "Flight" },
    hotel: { icon: Building2, color: "text-node-hotel", label: "Hotel" },
    attraction: { icon: MapPin, color: "text-node-attraction", label: "Attraction" },
    transport: { icon: Plane, color: "text-muted-foreground", label: "Transport" },
  };
  const cfg = typeConfig[node.type];
  const Icon = cfg.icon;

  // Airport code to timezone mapping
  const getAirportTimezone = (airportCode: string): string => {
    const timezoneMap: Record<string, string> = {
      "SIN": "Asia/Singapore",
      "JFK": "America/New_York",
      "LGA": "America/New_York",
      "EWR": "America/New_York",
      "LHR": "Europe/London",
      "CDG": "Europe/Paris",
      "FRA": "Europe/Berlin",
      "AMS": "Europe/Amsterdam",
      "HKG": "Asia/Hong_Kong",
      "NRT": "Asia/Tokyo",
      "HND": "Asia/Tokyo",
      "SYD": "Australia/Sydney",
      "MEL": "Australia/Melbourne",
      "DXB": "Asia/Dubai",
      "BKK": "Asia/Bangkok",
      "ICN": "Asia/Seoul",
      "PEK": "Asia/Shanghai",
      "PVG": "Asia/Shanghai",
      "SFO": "America/Los_Angeles",
      "LAX": "America/Los_Angeles",
      "SEA": "America/Los_Angeles",
      "ORD": "America/Chicago",
      "DFW": "America/Chicago",
      "MIA": "America/New_York",
      "DEN": "America/Denver",
      "ATL": "America/New_York",
    };
    return timezoneMap[airportCode.toUpperCase()] || "UTC";
  };

  const formatDateTime = (dateTimeStr: string, airportCode: string): string => {
    try {
      const date = new Date(dateTimeStr);
      const timezone = getAirportTimezone(airportCode);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(date);
    } catch {
      return dateTimeStr;
    }
  };

  const fieldLabelMap: Record<string, string> = {
    flight_number: "Flight Number",
    aircraft_type: "Aircraft",
    co2_kg: "CO2 Consumption (kg)",
    datetime_departure: "Departure (Origin/Destination)",
    datetime_arrival: "Arrival (Origin/Destination)",
    external_link: "More Information",
  };

  const excludedFields = ["price_sgd", "price_usd", "arrival_time"];

  // Determine if this is a bookable flight (status not already confirmed)
  const isFlightNode = node.type === "flight";
  const isConfirmed = node.status === "confirmed";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`text-[10px] font-mono uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight">{node.title}</h1>
          {node.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{node.subtitle}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 py-4 border-t border-border">
            <InfoBlock icon={Clock} label="Date" value={new Date(node.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
            <InfoBlock icon={Clock} label="Time" value={node.time} />
            {node.duration && <InfoBlock icon={Clock} label="Duration" value={node.duration} />}
            <InfoBlock
              icon={Shield}
              label="Status"
              value={node.status.charAt(0).toUpperCase() + node.status.slice(1)}
              warn={node.status === "conflict" || node.status === "cancelled"}
              success={isConfirmed}
            />
          </div>

          {Object.keys(node.details).length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</span>
              {Object.entries(node.details)
                .filter(([key]) => !excludedFields.includes(key))
                .map(([key, val]) => (
                  <div key={key} className="text-sm py-1 border-b border-border/50">
                    <span className="text-muted-foreground block">{fieldLabelMap[key] || key}</span>
                    <span className={`font-mono break-all ${key === "external_link" ? "text-accent hover:text-accent/80" : ""}`}>
                      {key === "external_link" ? (
                        <a href={val as string} target="_blank" rel="noopener noreferrer" className="block mt-1 w-full">
                          {val as string}
                        </a>
                      ) : key === "datetime_departure" || key === "datetime_arrival" ? (
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Origin ({node.details.origin || 'N/A'}):</span>
                            <span>{formatDateTime(val as string, node.details.origin || 'UTC')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Destination ({node.details.destination || 'N/A'}):</span>
                            <span>{formatDateTime(val as string, node.details.destination || 'UTC')}</span>
                          </div>
                        </div>
                      ) : (
                        val as string
                      )}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {onBook && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-2xl font-mono tabular-nums font-medium">
                ${node.cost.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">{node.currency}</span>
            </div>
            <Button
              variant="accent"
              size="lg"
              onClick={onBook}
              disabled={isConfirmed && isFlightNode}
            >
              {isConfirmed && isFlightNode ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Booked
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Book {cfg.label}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
  warn,
  success,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  warn?: boolean;
  success?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <p
        className={`text-sm font-mono capitalize ${
          warn ? "text-destructive" : success ? "text-node-hotel" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default ItemDetail;
