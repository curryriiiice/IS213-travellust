import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockFlightResults, airports, type FlightOffer } from "@/data/flightData";
import {
  Plane,
  ArrowRight,
  Clock,
  Leaf,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";

type SortKey = "price" | "duration" | "departure" | "stops";

interface FlightSearchPanelProps {
  onSelectFlight?: (flight: FlightOffer) => void;
  onClose?: () => void;
}

export function FlightSearchPanel({ onSelectFlight, onClose }: FlightSearchPanelProps) {
  const [origin, setOrigin] = useState("SFO");
  const [destination, setDestination] = useState("NRT");
  const [date, setDate] = useState("2026-04-12");
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [maxStops, setMaxStops] = useState<number | null>(null);

  const airportCodes = Object.keys(airports);

  const filteredResults = useMemo(() => {
    if (!hasSearched) return [];
    let results = [...mockFlightResults];

    if (cabin !== "all") {
      results = results.filter((f) => f.cabin === cabin);
    }
    if (maxStops !== null) {
      results = results.filter((f) => f.stops <= maxStops);
    }

    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "price":
          cmp = a.price - b.price;
          break;
        case "duration":
          cmp = a.durationMinutes - b.durationMinutes;
          break;
        case "departure":
          cmp = a.departureTime.localeCompare(b.departureTime);
          break;
        case "stops":
          cmp = a.stops - b.stops;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return results;
  }, [hasSearched, cabin, sortBy, sortAsc, maxStops]);

  const handleSearch = () => {
    setIsLoading(true);
    setHasSearched(false);
    // Simulate API call
    setTimeout(() => {
      setHasSearched(true);
      setIsLoading(false);
    }, 800);
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const minPrice = hasSearched
    ? Math.min(...filteredResults.map((f) => f.price))
    : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Flight Search
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Search form */}
      <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {/* Origin */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Origin
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {airportCodes.map((code) => (
                <option key={code} value={code}>
                  {code} — {airports[code]}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Destination
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {airportCodes.map((code) => (
                <option key={code} value={code}>
                  {code} — {airports[code]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Date */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Passengers */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Pax
            </label>
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "adult" : "adults"}
                </option>
              ))}
            </select>
          </div>

          {/* Cabin */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Cabin
            </label>
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value)}
              className="w-full h-8 bg-secondary border border-border rounded-sm px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">All</option>
              <option value="economy">Economy</option>
              <option value="premium_economy">Prem. Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
        </div>

        <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
          <Search className="w-3.5 h-3.5" />
          Search Flights
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-sm animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {hasSearched && !isLoading && (
        <div className="flex-1 overflow-y-auto">
          {/* Sort & filter bar */}
          <div className="px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              {filteredResults.length} offers found
            </span>
            <div className="flex items-center gap-1">
              {/* Stops filter */}
              <div className="flex items-center gap-1 mr-2">
                {[null, 0, 1].map((s) => (
                  <button
                    key={String(s)}
                    onClick={() => setMaxStops(s)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors ${
                      maxStops === s
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {s === null ? "Any" : s === 0 ? "Direct" : "≤1 stop"}
                  </button>
                ))}
              </div>
              {/* Sort buttons */}
              {(["price", "duration", "departure", "stops"] as SortKey[]).map((key) => (
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

          {/* Flight cards */}
          <div className="p-3 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {filteredResults.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isCheapest={flight.price === minPrice}
                  isExpanded={expandedId === flight.id}
                  onToggle={() =>
                    setExpandedId(expandedId === flight.id ? null : flight.id)
                  }
                  onSelect={onSelectFlight}
                  passengers={passengers}
                />
              ))}
            </AnimatePresence>

            {filteredResults.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Plane className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No flights match your filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Plane className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-xs">Enter route and date to search</p>
            <p className="text-[10px] mt-1 text-muted-foreground/60">
              Powered by Amadeus GDS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flight result card ──────────────────────────────────────────────

interface FlightCardProps {
  flight: FlightOffer;
  isCheapest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: (flight: FlightOffer) => void;
  passengers: number;
}

function FlightCard({
  flight,
  isCheapest,
  isExpanded,
  onToggle,
  onSelect,
  passengers,
}: FlightCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card border border-border rounded-sm overflow-hidden node-interactive"
    >
      {/* Main row */}
      <div className="px-3 py-3 flex items-center gap-3 cursor-pointer" onClick={onToggle}>
        {/* Airline */}
        <div className="w-10 text-center shrink-0">
          <span className="text-[10px] font-mono font-medium block">{flight.airlineCode}</span>
          <span className="text-[9px] text-muted-foreground font-mono">{flight.flightNumber.split(" ")[1]}</span>
        </div>

        {/* Route & times */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="text-right shrink-0">
            <span className="text-sm font-mono tabular-nums font-medium block">{flight.departureTime}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{flight.origin}</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
            <span className="text-[9px] text-muted-foreground font-mono">{flight.duration}</span>
            <div className="w-full flex items-center gap-0.5">
              <div className="flex-1 h-px bg-border" />
              {flight.stops > 0 ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-node-attraction" />
                  <div className="flex-1 h-px bg-border" />
                </>
              ) : null}
              <Plane className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">
              {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
              {flight.stopCities ? ` (${flight.stopCities.join(", ")})` : ""}
            </span>
          </div>

          <div className="text-left shrink-0">
            <span className="text-sm font-mono tabular-nums font-medium block">{flight.arrivalTime}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{flight.destination}</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 pl-2 border-l border-border/50">
          <span className="text-sm font-mono tabular-nums font-medium block">
            ${flight.price.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 justify-end">
            {isCheapest && (
              <Badge variant="outline" className="text-node-hotel border-node-hotel/30 text-[8px] px-1 py-0">
                Best
              </Badge>
            )}
            <span className="text-[9px] text-muted-foreground capitalize font-mono">
              {flight.cabin.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/50">
              <div className="grid grid-cols-4 gap-3 mb-3">
                <DetailItem label="Airline" value={flight.airline} />
                <DetailItem label="Aircraft" value={flight.aircraft} />
                <DetailItem label="Baggage" value={flight.baggage} />
                <DetailItem
                  label="Seats Left"
                  value={String(flight.seatsRemaining)}
                  warn={flight.seatsRemaining <= 4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Leaf className="w-3 h-3" />
                    <span className="font-mono">{flight.co2Kg}kg CO₂</span>
                  </div>
                  {passengers > 1 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Total: ${(flight.price * passengers).toLocaleString()} ({passengers} pax)
                    </span>
                  )}
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(flight);
                  }}
                >
                  Select Flight
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block">
        {label}
      </span>
      <span className={`text-xs font-mono ${warn ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}
