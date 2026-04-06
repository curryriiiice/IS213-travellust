import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchHotels, hotelCities, type HotelOffer } from "@/data/hotelData";
import {
  Building2,
  Star,
  MapPin,
  Search,
  ChevronUp,
  ChevronDown,
  Coffee,
  X as XIcon,
  Wifi,
  Dumbbell,
  UtensilsCrossed,
} from "lucide-react";

type SortKey = "price" | "rating" | "stars";

interface HotelSearchPanelProps {
  onSelectHotel?: (hotel: HotelOffer) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function HotelSearchPanel({ onSelectHotel, onClose, embedded }: HotelSearchPanelProps) {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("2026-04-12");
  const [checkOut, setCheckOut] = useState("2026-04-15");
  const [guests, setGuests] = useState(2);
  const [sortBy, setSortBy] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [hotels, setHotels] = useState<HotelOffer[]>([]);

  const cityCodes = Object.keys(hotelCities);

  const filteredResults = useMemo(() => {
    if (!hasSearched) return [];
    let results = [...hotels];

    if (maxPrice !== null) {
      results = results.filter((h) => h.price <= maxPrice);
    }

    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "price":
          cmp = a.price - b.price;
          break;
        case "rating":
          cmp = a.overall_rating - b.overall_rating;
          break;
        case "stars":
          cmp = a.starRating - b.starRating;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return results;
  }, [hasSearched, sortBy, sortAsc, maxPrice]);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(false);
    try {
      const results = await searchHotels(hotelCities[destination] || destination, checkIn, checkOut, guests);
      setHotels(results);
    } catch (error) {
      console.error(error);
      setHotels([]);
    } finally {
      setHasSearched(true);
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(key === "price"); }
  };

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const minPrice = hasSearched && filteredResults.length > 0
    ? Math.min(...filteredResults.map((h) => h.price))
    : 0;

  return (
    <div className={`h-full flex flex-col bg-background ${embedded ? "" : ""}`}>
      {/* Header */}
      {!embedded && (
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-node-hotel" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Hotel Search
            </span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <XIcon className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Search form */}
      <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Search city..."
            className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
            Guests
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </div>

        <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
          <Search className="w-3.5 h-3.5" />
          Search Hotels
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-sm animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {hasSearched && !isLoading && (
        <div className="flex-1 overflow-y-auto">
          {/* Sort bar */}
          <div className="px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              {filteredResults.length} hotels · {nights} night{nights > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 mr-2">
                {([null, 200, 500] as (number | null)[]).map((p) => (
                  <button
                    key={String(p)}
                    onClick={() => setMaxPrice(p)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors ${
                      maxPrice === p
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {p === null ? "Any" : `≤$${p}`}
                  </button>
                ))}
              </div>
              {(["price", "rating", "stars"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors flex items-center gap-0.5 ${
                    sortBy === key
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {key}
                  {sortBy === key && (
                    sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hotel cards */}
          <div className="p-3 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {filteredResults.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  nights={nights}
                  isCheapest={hotel.price === minPrice}
                  onSelect={onSelectHotel}
                />
              ))}
            </AnimatePresence>
            {filteredResults.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No hotels match your filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-xs">Select destination and dates</p>
            <p className="text-[10px] mt-1 text-muted-foreground/60">
              Powered by Hotels.com API
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hotel Card ──────────────────────────────────────────────────

function HotelCard({
  hotel,
  nights,
  isCheapest,
  onSelect,
}: {
  hotel: HotelOffer;
  nights: number;
  isCheapest: boolean;
  onSelect?: (hotel: HotelOffer) => void;
}) {
  const totalPrice = hotel.price * nights;

  const amenityIcon = (a: string) => {
    const lower = a.toLowerCase();
    if (lower.includes("wifi")) return <Wifi className="w-2.5 h-2.5" />;
    if (lower.includes("gym") || lower.includes("pool")) return <Dumbbell className="w-2.5 h-2.5" />;
    if (lower.includes("restaurant") || lower.includes("bar")) return <UtensilsCrossed className="w-2.5 h-2.5" />;
    return null;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card border border-border rounded-sm overflow-hidden node-interactive"
    >
      <div className="px-3 py-3 flex gap-3">
        {/* Placeholder or actual image area */}
        <div className="w-20 h-20 bg-secondary rounded-sm shrink-0 flex items-center justify-center overflow-hidden relative">
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
            <Building2 className="w-6 h-6 text-muted-foreground/30" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium tracking-tight truncate">{hotel.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-0.5 text-node-hotel">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span className="text-[10px] font-mono font-medium">{hotel.overall_rating > 0 ? hotel.overall_rating : "N/A"}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({hotel.reviews?.toLocaleString() || 0} reviews)
                </span>
                {hotel.chain && <span className="text-[10px] font-mono text-muted-foreground ml-1">{hotel.chain}</span>}
              </div>
              {hotel.distanceFromCenter && (
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 block" />
                    <span className="text-[10px] font-mono leading-tight">{hotel.distanceFromCenter}</span>
                  </div>
                  {hotel.locationRating && hotel.locationRating > 0 && (
                    <div className="flex items-center gap-1.5 border-l border-border pl-2">
                      <span className="text-[10px] font-mono leading-tight">Location: <span className="text-foreground font-medium">{hotel.locationRating}/5</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-mono tabular-nums font-medium block">
                {hotel.price === 0 ? "Unavailable" : `$${hotel.price}`}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">/night</span>
            </div>
          </div>

          {hotel.address && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                {hotel.address}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">

              {isCheapest && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 border-accent/30 text-accent">
                  Best Value
                </Badge>
              )}
              {hotel.freeCancellation && (
                <span className="text-[9px] text-node-hotel font-mono">Free cancel</span>
              )}
              {hotel.breakfastIncluded && (
                <span className="text-[9px] text-node-attraction font-mono flex items-center gap-0.5">
                  <Coffee className="w-2.5 h-2.5" /> Breakfast
                </span>
              )}
            </div>
            <Button
              variant="accent"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => onSelect?.(hotel)}
            >
              ${totalPrice.toLocaleString()} total
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
