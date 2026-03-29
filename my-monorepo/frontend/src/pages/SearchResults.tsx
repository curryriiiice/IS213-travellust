import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Building2,
  Compass,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Search,
  Leaf,
  Star,
  MapPin,
  Coffee,
  Wifi,
  Dumbbell,
  UtensilsCrossed,
  Plus,
  Check,
  X,
  User,
} from "lucide-react";
import { mockFlightResults, airports, type FlightOffer } from "@/data/flightData";
import { mockHotelResults, hotelCities, type HotelOffer } from "@/data/hotelData";
import { mockAttractionResults, attractionCities, type AttractionOffer } from "@/data/attractionData";
import { mockTrips } from "@/data/mockData";
import type { Trip } from "@/types/trip";
import { toast } from "@/hooks/use-toast";

type SearchTab = "flights" | "hotels" | "attractions";
type FlightSortKey = "price" | "duration" | "departure" | "stops";
type HotelSortKey = "price" | "rating" | "stars" | "distance";
type AttractionSortKey = "price" | "rating" | "duration";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = (searchParams.get("type") as SearchTab) || "flights";

  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true); // auto-search on load

  // Flight state
  const [fOrigin, setFOrigin] = useState(searchParams.get("origin") || "SFO");
  const [fDest, setFDest] = useState(searchParams.get("destination") || "NRT");
  const [fDate, setFDate] = useState(searchParams.get("date") || "2026-04-12");
  const [fPax, setFPax] = useState(Number(searchParams.get("passengers")) || 1);
  const [fCabin, setFCabin] = useState(searchParams.get("cabin") || "all");
  const [fSort, setFSort] = useState<FlightSortKey>("price");
  const [fSortAsc, setFSortAsc] = useState(true);
  const [fMaxStops, setFMaxStops] = useState<number | null>(null);
  const [fExpandedId, setFExpandedId] = useState<string | null>(null);

  // Hotel state
  const [hDest, setHDest] = useState(searchParams.get("destination") || "tokyo");
  const [hCheckIn, setHCheckIn] = useState(searchParams.get("checkIn") || "2026-04-12");
  const [hCheckOut, setHCheckOut] = useState(searchParams.get("checkOut") || "2026-04-15");
  const [hGuests, setHGuests] = useState(Number(searchParams.get("guests")) || 2);
  const [hRooms, setHRooms] = useState(Number(searchParams.get("rooms")) || 1);
  const [hSort, setHSort] = useState<HotelSortKey>("price");
  const [hSortAsc, setHSortAsc] = useState(true);
  const [hMaxPrice, setHMaxPrice] = useState<number | null>(null);

  // Attraction state
  const [aCity, setACity] = useState(searchParams.get("destination") || "tokyo");
  const [aDate, setADate] = useState(searchParams.get("date") || "2026-04-12");
  const [aSort, setASort] = useState<AttractionSortKey>("rating");
  const [aSortAsc, setASortAsc] = useState(false);
  const [aMaxPrice, setAMaxPrice] = useState<number | null>(null);

  // Add-to-trip modal
  const [tripPickerItem, setTripPickerItem] = useState<{ type: "flight"; data: FlightOffer } | { type: "hotel"; data: HotelOffer } | { type: "attraction"; data: AttractionOffer } | null>(null);

  const airportCodes = Object.keys(airports);
  const cityCodes = Object.keys(hotelCities);
  const attractionCityCodes = Object.keys(attractionCities);

  // Flight results
  const flightResults = useMemo(() => {
    if (!hasSearched || activeTab !== "flights") return [];
    let results = [...mockFlightResults];
    if (fCabin !== "all") results = results.filter((f) => f.cabin === fCabin);
    if (fMaxStops !== null) results = results.filter((f) => f.stops <= fMaxStops);
    results.sort((a, b) => {
      let cmp = 0;
      switch (fSort) {
        case "price": cmp = a.price - b.price; break;
        case "duration": cmp = a.durationMinutes - b.durationMinutes; break;
        case "departure": cmp = a.departureTime.localeCompare(b.departureTime); break;
        case "stops": cmp = a.stops - b.stops; break;
      }
      return fSortAsc ? cmp : -cmp;
    });
    return results;
  }, [hasSearched, activeTab, fCabin, fSort, fSortAsc, fMaxStops]);

  // Hotel results
  const hNights = Math.max(1, Math.round((new Date(hCheckOut).getTime() - new Date(hCheckIn).getTime()) / 86400000));
  const hotelResults = useMemo(() => {
    if (!hasSearched || activeTab !== "hotels") return [];
    let results = [...mockHotelResults];
    if (hMaxPrice !== null) results = results.filter((h) => h.pricePerNight <= hMaxPrice);
    results.sort((a, b) => {
      let cmp = 0;
      switch (hSort) {
        case "price": cmp = a.pricePerNight - b.pricePerNight; break;
        case "rating": cmp = a.guestRating - b.guestRating; break;
        case "stars": cmp = a.starRating - b.starRating; break;
        case "distance": cmp = parseFloat(a.distanceFromCenter) - parseFloat(b.distanceFromCenter); break;
      }
      return hSortAsc ? cmp : -cmp;
    });
    return results;
  }, [hasSearched, activeTab, hSort, hSortAsc, hMaxPrice]);

  // Attraction results
  const attractionResults = useMemo(() => {
    if (!hasSearched || activeTab !== "attractions") return [];
    let results = [...mockAttractionResults];
    if (aMaxPrice !== null) results = results.filter((a) => a.price <= aMaxPrice);
    results.sort((a, b) => {
      let cmp = 0;
      switch (aSort) {
        case "price": cmp = a.price - b.price; break;
        case "rating": cmp = b.rating - a.rating; break;
        case "duration": cmp = a.durationMinutes - b.durationMinutes; break;
      }
      return aSortAsc ? cmp : -cmp;
    });
    return results;
  }, [hasSearched, activeTab, aSort, aSortAsc, aMaxPrice]);

  const flightMinPrice = flightResults.length > 0 ? Math.min(...flightResults.map((f) => f.price)) : 0;
  const hotelMinPrice = hotelResults.length > 0 ? Math.min(...hotelResults.map((h) => h.pricePerNight)) : 0;

  const handleFlightSort = (key: FlightSortKey) => {
    if (fSort === key) setFSortAsc(!fSortAsc);
    else { setFSort(key); setFSortAsc(true); }
  };

  const handleHotelSort = (key: HotelSortKey) => {
    if (hSort === key) setHSortAsc(!hSortAsc);
    else { setHSort(key); setHSortAsc(key === "price" || key === "distance"); }
  };

  const handleSearch = () => {
    setIsLoading(true);
    setHasSearched(false);
    setTimeout(() => { setHasSearched(true); setIsLoading(false); }, 600);
  };

  const handleAddToTrip = (trip: Trip) => {
    if (!tripPickerItem) return;
    const itemName = tripPickerItem.type === "flight"
      ? `${tripPickerItem.data.flightNumber}`
      : tripPickerItem.data.name;
    const itemDetail = tripPickerItem.type === "flight"
      ? `${tripPickerItem.data.origin} → ${tripPickerItem.data.destination} · $${tripPickerItem.data.price}`
      : tripPickerItem.type === "hotel"
      ? `${tripPickerItem.data.city} · $${tripPickerItem.data.pricePerNight}/night`
      : `${tripPickerItem.data.city} · $${tripPickerItem.data.price}`;

    toast({
      title: `Added to ${trip.name}`,
      description: `${itemName} — ${itemDetail}`,
    });
    setTripPickerItem(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium tracking-tight">TravelLust</span>
          </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/profile")}
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex gap-0 min-h-[calc(100vh-48px)]">
        {/* Left sidebar — search form */}
        <aside className="w-80 shrink-0 border-r border-border bg-card/30 p-4 space-y-4 sticky top-12 h-[calc(100vh-48px)] overflow-y-auto">
          {/* Tab toggle */}
          <div className="flex border border-border rounded-sm bg-card overflow-hidden">
            <button
              onClick={() => { setActiveTab("flights"); setHasSearched(true); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                activeTab === "flights" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Plane className="w-3 h-3" /> Flights
            </button>
            <button
              onClick={() => { setActiveTab("hotels"); setHasSearched(true); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors border-l border-border ${
                activeTab === "hotels" ? "bg-node-hotel text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Building2 className="w-3 h-3" /> Hotels
            </button>
            <button
              onClick={() => { setActiveTab("attractions"); setHasSearched(true); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors border-l border-border ${
                activeTab === "attractions" ? "bg-node-attraction text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <MapPin className="w-3 h-3" /> Attractions
            </button>
          </div>

          {/* Flight search form */}
          {activeTab === "flights" && (
            <div className="space-y-3">
              <FormField label="Origin">
                <select value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} className="form-select-style">
                  {airportCodes.map((c) => <option key={c} value={c}>{c} — {airports[c]}</option>)}
                </select>
              </FormField>
              <FormField label="Destination">
                <select value={fDest} onChange={(e) => setFDest(e.target.value)} className="form-select-style">
                  {airportCodes.map((c) => <option key={c} value={c}>{c} — {airports[c]}</option>)}
                </select>
              </FormField>
              <FormField label="Date">
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="form-select-style" />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Passengers">
                  <select value={fPax} onChange={(e) => setFPax(Number(e.target.value))} className="form-select-style">
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? "adult" : "adults"}</option>)}
                  </select>
                </FormField>
                <FormField label="Cabin">
                  <select value={fCabin} onChange={(e) => setFCabin(e.target.value)} className="form-select-style">
                    <option value="all">All</option>
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </FormField>
              </div>
              <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
                <Search className="w-3.5 h-3.5" /> Search Flights
              </Button>
            </div>
          )}

          {/* Hotel search form */}
          {activeTab === "hotels" && (
            <div className="space-y-3">
              <FormField label="Destination">
                <select value={hDest} onChange={(e) => setHDest(e.target.value)} className="form-select-style">
                  {cityCodes.map((c) => <option key={c} value={c}>{hotelCities[c]}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Check-in">
                  <input type="date" value={hCheckIn} onChange={(e) => setHCheckIn(e.target.value)} className="form-select-style" />
                </FormField>
                <FormField label="Check-out">
                  <input type="date" value={hCheckOut} onChange={(e) => setHCheckOut(e.target.value)} className="form-select-style" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Guests">
                  <select value={hGuests} onChange={(e) => setHGuests(Number(e.target.value))} className="form-select-style">
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
                  </select>
                </FormField>
                <FormField label="Rooms">
                  <select value={hRooms} onChange={(e) => setHRooms(Number(e.target.value))} className="form-select-style">
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? "room" : "rooms"}</option>)}
                  </select>
                </FormField>
              </div>
              <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
                <Search className="w-3.5 h-3.5" /> Search Hotels
              </Button>
            </div>
          )}
          {/* Attraction search form */}
          {activeTab === "attractions" && (
            <div className="space-y-3">
              <FormField label="City">
                <select value={aCity} onChange={(e) => setACity(e.target.value)} className="form-select-style">
                  {attractionCityCodes.map((c) => <option key={c} value={c}>{attractionCities[c]}</option>)}
                </select>
              </FormField>
              <FormField label="Date">
                <input type="date" value={aDate} onChange={(e) => setADate(e.target.value)} className="form-select-style" />
              </FormField>
              <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
                <Search className="w-3.5 h-3.5" /> Search Attractions
              </Button>
            </div>
          )}
        </aside>

        {/* Main results area */}
        <main className="flex-1 flex flex-col">
          {/* Sort/filter bar */}
          {hasSearched && !isLoading && (
            <div className="px-5 py-2.5 border-b border-border bg-card/50 flex items-center justify-between shrink-0 sticky top-12 z-40 backdrop-blur-sm">
              {activeTab === "flights" ? (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {flightResults.length} flights found
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 mr-2">
                      {([null, 0, 1] as (number | null)[]).map((s) => (
                        <button key={String(s)} onClick={() => setFMaxStops(s)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors ${fMaxStops === s ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          {s === null ? "Any" : s === 0 ? "Direct" : "≤1 stop"}
                        </button>
                      ))}
                    </div>
                    {(["price", "duration", "departure", "stops"] as FlightSortKey[]).map((key) => (
                      <button key={key} onClick={() => handleFlightSort(key)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors flex items-center gap-0.5 ${fSort === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        {key}
                        {fSort === key && (fSortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                      </button>
                    ))}
                  </div>
                </>
              ) : activeTab === "hotels" ? (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {hotelResults.length} hotels · {hNights} night{hNights > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 mr-2">
                      {([null, 200, 500] as (number | null)[]).map((p) => (
                        <button key={String(p)} onClick={() => setHMaxPrice(p)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors ${hMaxPrice === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          {p === null ? "Any" : `≤$${p}`}
                        </button>
                      ))}
                    </div>
                    {(["price", "rating", "stars", "distance"] as HotelSortKey[]).map((key) => (
                      <button key={key} onClick={() => handleHotelSort(key)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors flex items-center gap-0.5 ${hSort === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        {key}
                        {hSort === key && (hSortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {attractionResults.length} attractions found
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 mr-2">
                      {([null, 20, 50] as (number | null)[]).map((p) => (
                        <button key={String(p)} onClick={() => setAMaxPrice(p)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors ${aMaxPrice === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          {p === null ? "Any" : `≤$${p}`}
                        </button>
                      ))}
                    </div>
                    {(["rating", "price", "duration"] as AttractionSortKey[]).map((key) => (
                      <button key={key} onClick={() => { if (aSort === key) setASortAsc(!aSortAsc); else { setASort(key); setASortAsc(false); } }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-sm transition-colors flex items-center gap-0.5 ${aSort === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        {key}
                        {aSort === key && (aSortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="p-5 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`${activeTab === "flights" ? "h-20" : "h-28"} bg-card border border-border rounded-sm animate-pulse`} />
              ))}
            </div>
          )}

          {/* Flight results */}
          {hasSearched && !isLoading && activeTab === "flights" && (
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {flightResults.map((flight) => (
                  <FlightResultCard
                    key={flight.id}
                    flight={flight}
                    isCheapest={flight.price === flightMinPrice}
                    isExpanded={fExpandedId === flight.id}
                    onToggle={() => setFExpandedId(fExpandedId === flight.id ? null : flight.id)}
                    onAddToTrip={() => setTripPickerItem({ type: "flight", data: flight })}
                    onViewDetails={() => navigate("/details", { state: { itemType: "flight", data: flight } })}
                    passengers={fPax}
                  />
                ))}
              </AnimatePresence>
              {flightResults.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Plane className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-xs">No flights match your filters</p>
                </div>
              )}
            </div>
          )}

          {/* Hotel results */}
          {hasSearched && !isLoading && activeTab === "hotels" && (
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {hotelResults.map((hotel) => (
                  <HotelResultCard
                    key={hotel.id}
                    hotel={hotel}
                    nights={hNights}
                    rooms={hRooms}
                    isCheapest={hotel.pricePerNight === hotelMinPrice}
                    onAddToTrip={() => setTripPickerItem({ type: "hotel", data: hotel })}
                    onViewDetails={() => navigate("/details", { state: { itemType: "hotel", data: hotel } })}
                  />
                ))}
              </AnimatePresence>
              {hotelResults.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-xs">No hotels match your filters</p>
                </div>
              )}
            </div>
          )}

          {/* Attraction results */}
          {hasSearched && !isLoading && activeTab === "attractions" && (
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {attractionResults.map((attraction) => (
                  <AttractionResultCard
                    key={attraction.id}
                    attraction={attraction}
                    onAddToTrip={() => setTripPickerItem({ type: "attraction", data: attraction })}
                    onViewDetails={() => navigate("/details", { state: { itemType: "attraction", data: attraction } })}
                  />
                ))}
              </AnimatePresence>
              {attractionResults.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-xs">No attractions match your filters</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Trip picker modal */}
      <AnimatePresence>
        {tripPickerItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setTripPickerItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border border-border rounded-sm w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium tracking-tight">Add to Trip</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {tripPickerItem.type === "flight"
                      ? `${tripPickerItem.data.flightNumber} · $${tripPickerItem.data.price}`
                      : tripPickerItem.type === "hotel"
                      ? `${tripPickerItem.data.name} · $${tripPickerItem.data.pricePerNight}/night`
                      : `${tripPickerItem.data.name} · $${tripPickerItem.data.price}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTripPickerItem(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
                {mockTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleAddToTrip(trip)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm border border-border bg-secondary/30 hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-sm bg-accent/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">{trip.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{trip.destination}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">{trip.nodes.length} items</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Shared form field ────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Flight card ─────────────────────────────────
function FlightResultCard({
  flight,
  isCheapest,
  isExpanded,
  onToggle,
  onAddToTrip,
  onViewDetails,
  passengers,
}: {
  flight: FlightOffer;
  isCheapest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onAddToTrip: () => void;
  onViewDetails: () => void;
  passengers: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card border border-border rounded-sm overflow-hidden node-interactive"
    >
      <div className="px-4 py-3.5 flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className="w-12 text-center shrink-0">
          <span className="text-[10px] font-mono font-medium block">{flight.airlineCode}</span>
          <span className="text-[9px] text-muted-foreground font-mono">{flight.flightNumber.split(" ")[1]}</span>
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="text-right shrink-0">
            <span className="text-sm font-mono tabular-nums font-medium block">{flight.departureTime}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{flight.origin}</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
            <span className="text-[9px] text-muted-foreground font-mono">{flight.duration}</span>
            <div className="w-full flex items-center gap-0.5">
              <div className="flex-1 h-px bg-border" />
              {flight.stops > 0 && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-node-attraction" />
                  <div className="flex-1 h-px bg-border" />
                </>
              )}
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

        <div className="text-right shrink-0 pl-3 border-l border-border/50">
          <span className="text-sm font-mono tabular-nums font-medium block">${flight.price.toLocaleString()}</span>
          <div className="flex items-center gap-1 justify-end">
            {isCheapest && (
              <Badge variant="outline" className="text-node-hotel border-node-hotel/30 text-[8px] px-1 py-0">Best</Badge>
            )}
            <span className="text-[9px] text-muted-foreground capitalize font-mono">{flight.cabin.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3.5 pt-1 border-t border-border/50">
              <div className="grid grid-cols-4 gap-4 mb-3">
                <DetailItem label="Airline" value={flight.airline} />
                <DetailItem label="Aircraft" value={flight.aircraft} />
                <DetailItem label="Baggage" value={flight.baggage} />
                <DetailItem label="Seats Left" value={String(flight.seatsRemaining)} warn={flight.seatsRemaining <= 4} />
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                    View Details
                  </Button>
                  <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); onAddToTrip(); }}>
                    <Plus className="w-3 h-3" /> Add to Trip
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Hotel card ──────────────────────────────────
function HotelResultCard({
  hotel,
  nights,
  rooms,
  isCheapest,
  onAddToTrip,
  onViewDetails,
}: {
  hotel: HotelOffer;
  nights: number;
  rooms: number;
  isCheapest: boolean;
  onAddToTrip: () => void;
  onViewDetails: () => void;
}) {
  const totalPrice = hotel.pricePerNight * nights * rooms;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card border border-border rounded-sm overflow-hidden node-interactive"
    >
      <div className="px-4 py-3.5 flex gap-4">
        <div className="w-24 h-24 bg-secondary rounded-sm shrink-0 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-muted-foreground/30" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium tracking-tight truncate">{hotel.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-node-attraction text-node-attraction" />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{hotel.chain}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-mono tabular-nums font-medium block">${hotel.pricePerNight}</span>
              <span className="text-[9px] text-muted-foreground font-mono">/night</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              {hotel.distanceFromCenter} from center · {hotel.roomType}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] px-1 py-0 border-node-hotel/30 text-node-hotel">
                {hotel.guestRating}
              </Badge>
              {isCheapest && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 border-accent/30 text-accent">Best Value</Badge>
              )}
              {hotel.freeCancellation && <span className="text-[9px] text-node-hotel font-mono">Free cancel</span>}
              {hotel.breakfastIncluded && (
                <span className="text-[9px] text-node-attraction font-mono flex items-center gap-0.5">
                  <Coffee className="w-2.5 h-2.5" /> Breakfast
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">${totalPrice.toLocaleString()} total</span>
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onViewDetails}>
                View Details
              </Button>
              <Button variant="accent" size="sm" className="h-7 text-[10px]" onClick={onAddToTrip}>
                <Plus className="w-3 h-3" /> Add to Trip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block">{label}</span>
      <span className={`text-xs font-mono ${warn ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

// ── Attraction card ──────────────────────────────
function AttractionResultCard({
  attraction,
  onAddToTrip,
  onViewDetails,
}: {
  attraction: AttractionOffer;
  onAddToTrip: () => void;
  onViewDetails: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card border border-border rounded-sm overflow-hidden node-interactive"
    >
      <div className="px-4 py-3.5 flex gap-4">
        <div className="w-24 h-24 bg-secondary rounded-sm shrink-0 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-muted-foreground/30" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium tracking-tight truncate">{attraction.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[8px] px-1 py-0 border-node-attraction/30 text-node-attraction">
                  {attraction.category}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">{attraction.city}, {attraction.country}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-mono tabular-nums font-medium block">
                {attraction.price === 0 ? "Free" : `$${attraction.price}`}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">per person</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground font-mono truncate">{attraction.address}</span>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] px-1 py-0 border-node-hotel/30 text-node-hotel">
                ★ {attraction.rating}
              </Badge>
              <span className="text-[9px] text-muted-foreground font-mono">
                {attraction.durationMinutes >= 60
                  ? `${Math.floor(attraction.durationMinutes / 60)}h${attraction.durationMinutes % 60 > 0 ? ` ${attraction.durationMinutes % 60}m` : ""}`
                  : `${attraction.durationMinutes}m`}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">{attraction.openingHours}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onViewDetails}>
                View Details
              </Button>
              <Button variant="accent" size="sm" className="h-7 text-[10px]" onClick={onAddToTrip}>
                <Plus className="w-3 h-3" /> Add to Trip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SearchResults;
