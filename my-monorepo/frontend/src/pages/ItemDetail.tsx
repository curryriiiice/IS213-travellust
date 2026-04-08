import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { bookAttraction, bookFlight, cancelAttractionBooking, bookHotel } from "@/api/booking";
import { deletePlannedAttraction, updatePlannedAttraction } from "@/api/plan";
import { getCurrentUserId } from "@/lib/auth";

// Helper to convert ItineraryNode to HotelOffer when coming from booked tickets
function convertToHotelOffer(node: ItineraryNode): HotelOffer {
  return {
    id: node.id,
    name: node.title,
    chain: "",
    city: node.details?.location || "",
    address: node.details?.address || "",
    starRating: parseFloat(node.details?.overall_rating || "0"),
    overall_rating: parseFloat(node.details?.overall_rating || "0"),
    reviews: 0,
    price: node.cost,
    currency: node.currency,
    roomType: node.details?.room_type || "",
    amenities: node.details?.amenities?.split(",").map(a => a.trim()) || [],
    thumbnail: "",
    fallbackThumbnail: undefined,
    freeCancellation: node.details?.free_cancellation === "true",
    breakfastIncluded: node.details?.breakfast_included === "true",
    distanceFromCenter: "",
    locationRating: undefined,
  };
}

// Helper to convert ItineraryNode to FlightOffer when coming from booked tickets
function convertToFlightOffer(node: ItineraryNode): FlightOffer {
  return {
    id: node.id,
    airline: node.title,
    airlineCode: "",
    flightNumber: node.details?.flight_number || "",
    origin: node.details?.origin || "",
    originCity: node.details?.origin || "",
    destination: node.details?.destination || "",
    destinationCity: node.details?.destination || "",
    departureTime: node.time,
    departureTimeConverted: node.time,
    arrivalTime: "", // Calculated from departure + duration
    arrivalTimeConverted: "",
    arrivalDateTime: node.details?.datetime_arrival?.replace(" ", "T") || "", // Use API datetime if available
    duration: node.duration || "",
    durationMinutes: 0, // Extracted from duration string
    aircraft: node.details?.aircraft_type || "",
    cabin: node.details?.cabin || "economy",
    price: node.cost,
    currency: node.currency,
    legroom: node.details?.legroom || "",
    co2Kg: parseFloat(node.details?.co2_kg || "0"),
    externalLink: node.details?.external_link || "",
  };
}

const MAIN_USER_ID = getCurrentUserId();

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function durationMinutesFromNode(node: ItineraryNode): number {
  const fromDetails = Number(node.details.duration_minutes ?? "");
  if (!Number.isNaN(fromDetails) && fromDetails > 0) {
    return fromDetails;
  }
  return 120;
}

type ItemState =
  | { itemType: "flight"; data: FlightOffer }
  | { itemType: "hotel"; data: HotelOffer }
  | { itemType: "attraction"; data: AttractionOffer }
  | { itemType: "node"; data: ItineraryNode; tripId?: string; memberIds?: string[] };

const ItemDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as (ItemState & { fromBookings?: boolean }) | null;

  // Extract fromBookings flag with default false
  const fromBookings = state?.fromBookings || false;

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

  const handleAddAttractionToTrip = () => {
    if (state.itemType !== "attraction") return;
    navigate("/attractions/add-to-trip", { state });
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
    const nodeType = nodeState.data.type;
    const itemId = nodeState.data.id;

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
        title: "No Guests Selected",
        description: "Please select at least one guest.",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      if (nodeType === "flight") {
        await bookFlight(tripId, MAIN_USER_ID, selectedUserIds, itemId);
        setIsPassengerModalOpen(false);
        toast({
          title: "✈️ Flight Booking Successful",
          description: `Flight booked for ${selectedUserIds.length} passenger${selectedUserIds.length > 1 ? "s" : ""}. Status updated to Confirmed.`,
        });
      } else if (nodeType === "hotel") {
        await bookHotel(tripId, MAIN_USER_ID, selectedUserIds, itemId);
        setIsPassengerModalOpen(false);
        toast({
          title: "🏨 Hotel Booking Successful",
          description: `Hotel booked for ${selectedUserIds.length} guest${selectedUserIds.length > 1 ? "s" : ""}. Status updated to Confirmed.`,
        });
      } else {
        throw new Error(`Unsupported booking type: ${nodeType}`);
      }
      // Navigate back so Index refreshes (the backend has persisted the booking)
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
  const isNodeHotel =
    state.itemType === "node" && (state as { data: ItineraryNode }).data.type === "hotel";

  // Hide booking actions when coming from BookedTickets
  // All booked items should be read-only with disabled buttons
  const onBook = fromBookings
    ? undefined // Disable all booking actions for booked items
    : (isNodeHotel
      ? handleBookFlight
      : isNodeFlight
      ? handleBookFlight
      : state.itemType === "attraction"
      ? handleAddAttractionToTrip
      : state.itemType === "flight" || state.itemType === "hotel"
      ? handleBookGeneric
      : undefined);

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
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium tracking-tight">TravelLust</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {fromBookings ? (
            <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
              <Check className="w-3 h-3 mr-1" />
              Booked
            </Badge>
          ) : null}
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {fromBookings && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-semibold text-green-800">Already Booked</h3>
              <p className="text-xs text-green-700">
                This {state?.itemType === "flight" ? "flight" : state?.itemType === "hotel" ? "hotel" : "attraction"} has been added to your trip.
              </p>
            </div>
          </div>
        )}
        {state?.itemType === "flight" && <FlightDetail flight={state.data} onBook={onBook} />}
        {state?.itemType === "hotel" && <HotelDetail hotel={state.itemType === "node" ? convertToHotelOffer(state.data) : state.data} onBook={onBook} />}
        {state?.itemType === "attraction" && <AttractionDetail attraction={state.data} onBook={onBook} />}
        {state?.itemType === "node" && (
          <NodeDetail
            node={state.data}
            tripId={state.tripId}
            onBook={onBook}
            fromBookings={fromBookings}
          />
        )}
      </div>

      {/* Passenger Selection Modal */}
      <Dialog open={isPassengerModalOpen} onOpenChange={setIsPassengerModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-accent" />
              Select Guests
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-mono">
              Choose which trip members to book for.
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
                {selectedUserIds.length} guest{selectedUserIds.length !== 1 ? "s" : ""} selected
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
  // Safely access cabin property to prevent undefined errors
  const cabin = flight?.cabin || "economy";
  const cabinClass = cabin?.replace?.(/_/g, " ") || cabin || "economy";

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
            {flight?.origin} → {flight?.destination}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {flight?.airline} · {flight?.flightNumber}
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
            <InfoBlock icon={Plane} label="Aircraft" value={flight?.aircraft || "N/A"} />
            <InfoBlock icon={Shield} label="Cabin" value={cabinClass} />
            <InfoBlock icon={User} label="Legroom" value={flight?.legroom || "N/A"} />
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
        <div className="h-48 bg-secondary flex items-center justify-center border-b border-border overflow-hidden">
          {attraction.imageUrl ? (
            <img
              src={attraction.imageUrl}
              alt={attraction.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="w-16 h-16 text-muted-foreground/20" />
          )}
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
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {attraction.gmapsLink ? (
              <a
                href={attraction.gmapsLink}
                target="_blank"
                rel="noreferrer"
                className="text-node-attraction underline underline-offset-4 break-all"
              >
                Open in Google Maps
              </a>
            ) : (
              <span>{attraction.address}</span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-3">{attraction.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 py-4 border-t border-border">
            <InfoBlock
              icon={Clock}
              label="Best Time To Visit"
              value={attraction.bestTimeToVisit || "See operator details"}
            />
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

function NodeDetail({
  node,
  tripId,
  onBook,
  fromBookings = false,
}: {
  node: ItineraryNode;
  tripId?: string;
  onBook?: () => void;
  fromBookings?: boolean;
}) {
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

  const formatDateOnly = (dateTimeStr: string): string => {
    try {
      const date = new Date(dateTimeStr);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return dateTimeStr;
    }
  };

  const fieldLabelMap: Record<string, string> = {
    // Flight fields
    flight_number: "Flight Number",
    aircraft_type: "Aircraft",
    co2_kg: "CO2 Consumption (kg)",
    datetime_departure: "Departure (Origin/Destination)",
    datetime_arrival: "Arrival (Origin/Destination)",
    external_link: "More Information",
    // Hotel fields
    name: "Name",
    description: "Description",
    amenities: "Amenities",
    photos: "Photos",
    overall_rating: "Overall Rating",
    datetime_check_in: "Check In Date",
    datetime_check_out: "Check Out Date",
    nights: "Nights",
    rate_per_night: "Nightly Rate",
  };

  const excludedFields = ["price_sgd", "price_usd", "arrival_time", "lat", "long", "trip_id", "overall_rating", "nights"];

  const isFlightNode = node.type === "flight";
  const isAttractionNode = node.type === "attraction";
  // Determine if this is a bookable node (status not already confirmed)
  const isHotelNode = node.type === "hotel";
  const isConfirmed = node.status === "confirmed";
  const isFreeAttraction = isAttractionNode && node.cost <= 0;
  const isCatalogAttraction =
    isAttractionNode &&
    node.sourceType === "catalog";
  const isManualAttraction = isAttractionNode && node.sourceType === "manual";
  const showEditButton = isAttractionNode && Boolean(tripId) && !fromBookings;
  const showAttractionBookButton =
    isAttractionNode &&
    Boolean(tripId) &&
    isCatalogAttraction &&
    !isFreeAttraction &&
    !isConfirmed &&
    !fromBookings;
  const showAttractionCancelButton =
    isAttractionNode &&
    Boolean(tripId) &&
    isCatalogAttraction &&
    !isFreeAttraction &&
    isConfirmed &&
    !fromBookings;
  const showManualConfirmButton =
    isAttractionNode &&
    Boolean(tripId) &&
    isManualAttraction &&
    !isFreeAttraction &&
    !isConfirmed &&
    !fromBookings;
  const showGenericBookButton = Boolean(onBook) && !fromBookings;
  const showBookedButton = fromBookings && isConfirmed;
  const displayStatus =
    isAttractionNode && isFreeAttraction
      ? "Added"
      : isAttractionNode && isConfirmed
      ? isCatalogAttraction
        ? "Booked"
        : "Confirmed"
      : isAttractionNode
      ? "Pending"
      : node.status.charAt(0).toUpperCase() + node.status.slice(1);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingAttraction, setIsSavingAttraction] = useState(false);
  const [isBookingAttraction, setIsBookingAttraction] = useState(false);
  const [editName, setEditName] = useState(node.title);
  const [editLocation, setEditLocation] = useState(node.subtitle);
  const [editMapsLink, setEditMapsLink] = useState(node.mapsLink ?? node.details.gmaps_link ?? "");
  const [editDate, setEditDate] = useState(node.date);
  const [editTime, setEditTime] = useState(node.time);
  const [editDuration, setEditDuration] = useState(
    node.details.duration_minutes ?? String(durationMinutesFromNode(node))
  );
  const [editEndTime, setEditEndTime] = useState(
    addMinutesToTime(node.time, durationMinutesFromNode(node))
  );
  const [editCost, setEditCost] = useState(String(node.cost ?? 0));

  useEffect(() => {
    setEditName(node.title);
    setEditLocation(node.subtitle);
    setEditMapsLink(node.mapsLink ?? node.details.gmaps_link ?? "");
    setEditDate(node.date);
    setEditTime(node.time);
    const durationMinutes = durationMinutesFromNode(node);
    setEditDuration(String(durationMinutes));
    setEditEndTime(addMinutesToTime(node.time, durationMinutes));
    setEditCost(String(node.cost ?? 0));
  }, [node]);

  useEffect(() => {
    const durationMinutes = Number(editDuration);
    if (!Number.isNaN(durationMinutes) && durationMinutes >= 0) {
      setEditEndTime(addMinutesToTime(editTime, durationMinutes));
    }
  }, [editTime, editDuration]);

  const handleSaveAttraction = async () => {
    if (!tripId) {
      toast({
        title: "Update failed",
        description: "Trip ID is missing for this attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAttraction(true);
    try {
      await updatePlannedAttraction(tripId, MAIN_USER_ID, node.id, {
        name: editName,
        location: editLocation,
        gmapsLink: editMapsLink,
        visitDate: editDate,
        visitTime: editTime,
        durationMinutes: Number(editDuration) || 120,
        cost: Number(editCost) || 0,
      });
      toast({
        title: "Attraction updated",
        description: `${editName} was updated successfully.`,
      });
      setIsEditOpen(false);
      window.history.back();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingAttraction(false);
    }
  };

  const handleEditEndTime = (nextEndTime: string) => {
    setEditEndTime(nextEndTime);
    const [startHours, startMinutes] = editTime.split(":").map(Number);
    const [endHours, endMinutes] = nextEndTime.split(":").map(Number);
    if (
      [startHours, startMinutes, endHours, endMinutes].some((value) =>
        Number.isNaN(value)
      )
    ) {
      return;
    }

    let minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
    if (minutes < 0) {
      minutes += 1440;
    }
    setEditDuration(String(minutes));
  };

  const handleBookAttraction = async () => {
    if (!tripId) {
      toast({
        title: "Booking failed",
        description: "Trip ID is missing for this attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsBookingAttraction(true);
    try {
      await bookAttraction(tripId, MAIN_USER_ID, node.id);
      toast({
        title: "Attraction booked",
        description: `${node.title} is now booked for your trip.`,
      });
      window.history.back();
    } catch (error) {
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsBookingAttraction(false);
    }
  };

  const handleConfirmManualAttraction = async () => {
    if (!tripId) {
      toast({
        title: "Confirm failed",
        description: "Trip ID is missing for this attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAttraction(true);
    try {
      await updatePlannedAttraction(tripId, MAIN_USER_ID, node.id, {
        name: node.title,
        location: node.subtitle,
        gmapsLink: node.mapsLink ?? node.details.gmaps_link ?? "",
        visitDate: node.date,
        visitTime: node.time,
        durationMinutes: Number(node.details.duration_minutes ?? "120") || 120,
        cost: node.cost,
        status: "confirmed",
      });
      toast({
        title: "Attraction confirmed",
        description: `${node.title} is now confirmed.`,
      });
      window.history.back();
    } catch (error) {
      toast({
        title: "Confirm failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingAttraction(false);
    }
  };

  const handleCancelAttraction = async () => {
    if (!tripId) {
      toast({
        title: "Cancel failed",
        description: "Trip ID is missing for this attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsBookingAttraction(true);
    try {
      await cancelAttractionBooking(tripId, MAIN_USER_ID, node.id);
      toast({
        title: "Booking cancelled",
        description: `${node.title} is back to pending.`,
      });
      window.history.back();
    } catch (error) {
      toast({
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsBookingAttraction(false);
    }
  };

  const handleRemoveAttraction = async () => {
    if (!tripId) {
      toast({
        title: "Remove failed",
        description: "Trip ID is missing for this attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAttraction(true);
    try {
      await deletePlannedAttraction(tripId, MAIN_USER_ID, node.id);
      toast({
        title: "Attraction removed",
        description: `${node.title} was removed from the trip.`,
      });
      window.history.back();
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingAttraction(false);
    }
  };

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
            <InfoBlock icon={Clock} label={isHotelNode ? "Check In Time" : "Time"} value={node.time} />
            {isAttractionNode && (
              <InfoBlock
                icon={Clock}
                label="End Time"
                value={addMinutesToTime(node.time, durationMinutesFromNode(node))}
              />
            )}
            {node.duration && <InfoBlock icon={Clock} label="Duration" value={node.duration} />}
            <InfoBlock
              icon={Shield}
              label="Status"
              value={displayStatus}
              warn={node.status === "conflict" || node.status === "cancelled"}
              success={isConfirmed}
            />
          </div>

          {Object.keys(node.details).length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</span>
              {Object.entries(node.details)
                .filter(([key, value]) => {
                  if (excludedFields.includes(key)) return false;
                  if (key === "catalog_attraction_id") return false;
                  if (key === "gmaps_link" && !String(value || "").trim()) return false;
                  if (!String(value || "").trim()) return false;
                  return true;
                })
                .map(([key, val]) => (
                  <div key={key} className="text-sm py-1 border-b border-border/50">
                    <span className="text-muted-foreground block">
                      {key === "location" && isManualAttraction
                        ? "Subtitle"
                        : fieldLabelMap[key] || key}
                    </span>
                    <span className={`font-mono break-all ${key === "external_link" ? "text-accent hover:text-accent/80" : ""}`}>
                      {key === "external_link" ? (
                        <a href={val as string} target="_blank" rel="noopener noreferrer" className="block mt-1 w-full">
                          {val as string}
                        </a>
                      ) : key === "gmaps_link" ? (
                        <a
                          href={val as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-accent underline underline-offset-4"
                        >
                          Open in Google Maps
                        </a>
                      ) : key === "visit_time" ? (
                        <span>{node.time}</span>
                      ) : key === "duration_minutes" ? (
                        <span>{node.duration || `${val}m`}</span>
                      ) : key === "rate_per_night" ? (
                        <span>${val as string}</span>
                      ) : key === "datetime_check_in" || key === "datetime_check_out" ? (
                        <span>{formatDateOnly(val as string)}</span>
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

        {(showGenericBookButton || showEditButton || showAttractionBookButton || showManualConfirmButton || showBookedButton) && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="text-2xl font-mono tabular-nums font-medium">
                ${node.cost.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">{node.currency}</span>
            </div>
            <div className="flex items-center gap-3">
              {showEditButton && (
                <Button variant="outline" size="lg" onClick={() => setIsEditOpen(true)}>
                  Edit
                </Button>
              )}
              {showEditButton && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRemoveAttraction}
                  disabled={isSavingAttraction}
                >
                  Remove Attraction
                </Button>
              )}
              {showManualConfirmButton && (
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleConfirmManualAttraction}
                  disabled={isSavingAttraction}
                >
                  {isSavingAttraction ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Confirming...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              )}
              {showAttractionCancelButton && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancelAttraction}
                  disabled={isBookingAttraction}
                >
                  {isBookingAttraction ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Cancelling...
                    </>
                  ) : (
                    "Cancel Booking"
                  )}
                </Button>
              )}
              {showAttractionBookButton && (
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleBookAttraction}
                  disabled={isBookingAttraction}
                >
                  {isBookingAttraction ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Booking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Book Attraction
                    </>
                  )}
                </Button>
              )}
              {showGenericBookButton && (
                <Button
                  variant="accent"
                  size="lg"
                  onClick={onBook}
                  disabled={isConfirmed && (isFlightNode || isHotelNode)}
                >
                  {isConfirmed && (isFlightNode || isHotelNode) ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Booked
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Book {cfg.label}
                    </>
                  )}
                </Button>
              )}
              {showBookedButton && (
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                >
                  <>
                    <Check className="w-4 h-4 mr-1.5" /> Booked
                  </>
                </Button>
              )}
            </div>
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>Edit Attraction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Name
                </label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  {isManualAttraction ? "Subtitle" : "Location"}
                </label>
                <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    Date
                  </label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    Time
                  </label>
                  <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    Duration (min)
                  </label>
                  <Input type="number" min="0" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    End Time
                  </label>
                  <Input type="time" value={editEndTime} onChange={(e) => handleEditEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    Cost
                  </label>
                  <Input type="number" min="0" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Google Maps Link
                </label>
                <Input value={editMapsLink} onChange={(e) => setEditMapsLink(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isSavingAttraction}>
                Cancel
              </Button>
              <Button variant="accent" onClick={handleSaveAttraction} disabled={isSavingAttraction}>
                {isSavingAttraction ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
