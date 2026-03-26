import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Luggage,
  Users,
  Shield,
  Check,
  User,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FlightOffer } from "@/data/flightData";
import type { HotelOffer } from "@/data/hotelData";
import type { AttractionOffer } from "@/data/attractionData";
import type { ItineraryNode } from "@/types/trip";

type ItemState =
  | { itemType: "flight"; data: FlightOffer }
  | { itemType: "hotel"; data: HotelOffer }
  | { itemType: "attraction"; data: AttractionOffer }
  | { itemType: "node"; data: ItineraryNode };

const ItemDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as (ItemState & { fromBookings?: boolean }) | null;

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

  const handleBook = () => {
    navigate("/booking", { state });
  };

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
        {state.itemType === "flight" && <FlightDetail flight={state.data} onBook={state.fromBookings ? undefined : handleBook} />}
        {state.itemType === "hotel" && <HotelDetail hotel={state.data} onBook={state.fromBookings ? undefined : handleBook} />}
        {state.itemType === "attraction" && <AttractionDetail attraction={state.data} onBook={state.fromBookings ? undefined : handleBook} />}
        {state.itemType === "node" && <NodeDetail node={state.data} onBook={state.fromBookings ? undefined : handleBook} />}
      </div>
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
                {flight.stops > 0 && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-node-attraction" />
                    <div className="flex-1 h-px bg-border" />
                  </>
                )}
                <Plane className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""} (${flight.stopCities?.join(", ")})`}
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono tabular-nums font-medium">{flight.arrivalTime}</p>
              <p className="text-sm text-muted-foreground font-mono">{flight.destination}</p>
              <p className="text-xs text-muted-foreground">{flight.destinationCity}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-border">
            <InfoBlock icon={Plane} label="Aircraft" value={flight.aircraft} />
            <InfoBlock icon={Luggage} label="Baggage" value={flight.baggage} />
            <InfoBlock icon={Users} label="Seats Left" value={String(flight.seatsRemaining)} warn={flight.seatsRemaining <= 4} />
            <InfoBlock icon={Shield} label="Cabin" value={flight.cabin.replace("_", " ")} />
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
              <Check className="w-4 h-4 mr-1.5" /> Book Flight
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
        {/* Hero image placeholder */}
        <div className="h-48 bg-secondary flex items-center justify-center border-b border-border">
          <Building2 className="w-16 h-16 text-muted-foreground/20" />
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-node-hotel" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-node-hotel">Hotel</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight">{hotel.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-node-attraction text-node-attraction" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{hotel.chain}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-node-hotel/30 text-node-hotel">
              {hotel.guestRating} / 10
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">{hotel.reviewCount.toLocaleString()} reviews</span>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{hotel.address} · {hotel.distanceFromCenter} from center</span>
          </div>

          {/* Room type */}
          <div className="mt-4 p-3 bg-secondary/50 rounded-sm border border-border">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Room Type</span>
            <p className="text-sm font-medium mt-0.5">{hotel.roomType}</p>
          </div>

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
              <span className="text-2xl font-mono tabular-nums font-medium">${hotel.pricePerNight}</span>
              <span className="text-sm text-muted-foreground ml-1.5">per night</span>
            </div>
            <Button variant="accent" size="lg" onClick={onBook}>
              <Check className="w-4 h-4 mr-1.5" /> Book Hotel
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
              <Check className="w-4 h-4 mr-1.5" /> Book Attraction
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
            />
          </div>

          {Object.keys(node.details).length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</span>
              {Object.entries(node.details).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground capitalize">{key}</span>
                  <span className="font-mono">{val}</span>
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
            <Button variant="accent" size="lg" onClick={onBook}>
              <Check className="w-4 h-4 mr-1.5" /> Book {cfg.label}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoBlock({ icon: Icon, label, value, warn }: { icon: any; label: string; value: string; warn?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-sm font-mono capitalize ${warn ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

export default ItemDetail;
