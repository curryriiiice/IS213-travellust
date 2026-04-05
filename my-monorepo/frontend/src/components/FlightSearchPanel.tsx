import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { airports, searchFlights, type FlightOffer } from "@/data/flightData";
import {
  Plane,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Globe,
  Check,
} from "lucide-react";
type SortKey = "price" | "duration" | "departure";

interface FlightSearchPanelProps {
  onSelectFlight?: (flight: FlightOffer) => void;
  onClose?: () => void;
}

export function FlightSearchPanel({ onSelectFlight, onClose }: FlightSearchPanelProps) {
  const [origin, setOrigin] = useState("");
  const [originOpen, setOriginOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [date, setDate] = useState("2026-05-01");
  const [passengers, setPassengers] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const airportCodes = Object.keys(airports);

  const filteredResults = useMemo(() => {
    if (!hasSearched) return [];
    let results = [...flights];

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
      }
      return sortAsc ? cmp : -cmp;
    });

    return results;
  }, [hasSearched, sortBy, sortAsc, flights]);

  const handleSearch = async () => {
    console.log("handleSearch clicked");
    setIsLoading(true);
    setError(null);
    setHasSearched(false);

    try {
      console.log("Calling searchFlights with:", origin, destination, date);
      const results = await searchFlights(origin, destination, date);
      console.log("searchFlights returned:", results);
      setFlights(results);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search flights");
      setFlights([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const minPrice = hasSearched && filteredResults.length > 0
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
          <div className="flex flex-col">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Origin
            </label>
            <Popover open={originOpen} onOpenChange={setOriginOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={originOpen}
                  className="w-full h-8 justify-between bg-secondary border-border rounded-sm px-2 text-xs font-mono font-normal hover:bg-secondary/80"
                >
                  <span className={`truncate ${!origin ? "text-muted-foreground" : ""}`}>
                    {origin ? `${origin} — ${airports[origin]?.name || ""}` : "Enter origin"}
                  </span>
                  <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search airport..." className="h-8 text-xs font-mono" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs font-mono text-muted-foreground">No airport found.</CommandEmpty>
                    <CommandGroup>
                      {airportCodes.map((code) => (
                        <CommandItem
                          key={code}
                          value={`${code} ${airports[code].name}`}
                          onSelect={() => {
                            setOrigin(code);
                            setOriginOpen(false);
                          }}
                          className="text-xs font-mono cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3 w-3",
                              origin === code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{code} — {airports[code].name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Destination */}
          <div className="flex flex-col">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
              Destination
            </label>
            <Popover open={destOpen} onOpenChange={setDestOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={destOpen}
                  className="w-full h-8 justify-between bg-secondary border-border rounded-sm px-2 text-xs font-mono font-normal hover:bg-secondary/80"
                >
                  <span className={`truncate ${!destination ? "text-muted-foreground" : ""}`}>
                    {destination ? `${destination} — ${airports[destination]?.name || ""}` : "Enter destination"}
                  </span>
                  <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search airport..." className="h-8 text-xs font-mono" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs font-mono text-muted-foreground">No airport found.</CommandEmpty>
                    <CommandGroup>
                      {airportCodes.map((code) => (
                        <CommandItem
                          key={code}
                          value={`${code} ${airports[code].name}`}
                          onSelect={() => {
                            setDestination(code);
                            setDestOpen(false);
                          }}
                          className="text-xs font-mono cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3 w-3",
                              destination === code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{code} — {airports[code].name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
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
        </div>

        <Button
          variant="accent"
          size="sm"
          className="w-full"
          onClick={handleSearch}
          disabled={!origin || !destination}
        >
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
          {/* Sort bar */}
          <div className="px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              {filteredResults.length} offers found
            </span>
            <div className="flex items-center gap-1">
              {/* Sort buttons */}
              {(["price", "duration", "departure"] as SortKey[]).map((key) => (
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

          {/* Error state */}
          {error && (
            <div className="p-4 text-center text-destructive">
              <p className="text-xs">{error}</p>
            </div>
          )}

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

            {filteredResults.length === 0 && !error && (
              <div className="text-center py-12 text-muted-foreground">
                <Plane className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No flights found for this route</p>
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
            {flight.departureTimeConverted && (
              <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
                <Globe className="w-2 h-2" />{flight.departureTimeConverted} {flight.destination}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{flight.origin}</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
            <span className="text-[9px] text-muted-foreground font-mono">{flight.duration}</span>
            <div className="w-full flex items-center gap-0.5">
              <div className="flex-1 h-px bg-border" />
              <Plane className="w-2.5 h-2.5 text-muted-foreground" />
              <div className="flex-1 h-px bg-border" />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">Direct</span>
          </div>

          <div className="text-left shrink-0">
            <span className="text-sm font-mono tabular-nums font-medium block">{flight.arrivalTime}</span>
            {flight.arrivalTimeConverted && (
              <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                <Globe className="w-2 h-2" />{flight.arrivalTimeConverted} {flight.origin}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{flight.destination}</span>
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
              Economy
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
                <DetailItem label="Legroom" value={flight.legroom} />
                <DetailItem
                  label="CO₂"
                  value={`${flight.co2Kg}kg`}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
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
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block">
        {label}
      </span>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );
}
