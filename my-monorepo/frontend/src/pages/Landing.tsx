import { useState } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { airports } from "@/data/flightData";
import { hotelCities } from "@/data/hotelData";
import { attractionCities } from "@/data/attractionData";
import { Compass, Plane, Building2, Map, Users, Shield, Search, User, MapPin } from "lucide-react";

type SearchTab = "flights" | "hotels" | "attractions";

const Landing = () => {
  const [activeTab, setActiveTab] = useState<SearchTab>("flights");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium tracking-tight">TravelLust</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate("/trips")}
          >
            My Trips
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate("/bookings")}
          >
            Booked Tickets
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/3 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 pt-16 pb-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
              Plan your next trip,
              <br />
              <span className="text-accent">together.</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto font-mono">
              Search flights & hotels. Build itineraries.
              <br />
              Split costs with your group.
            </p>
          </motion.div>

          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg mx-auto"
          >
            {/* Tabs */}
            <div className="flex border border-border rounded-sm bg-card overflow-hidden mb-0">
              <button
                onClick={() => setActiveTab("flights")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                  activeTab === "flights"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                Flights
              </button>
              <button
                onClick={() => setActiveTab("hotels")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-widest transition-colors border-l border-border ${
                  activeTab === "hotels"
                    ? "bg-node-hotel text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Hotels
              </button>
              <button
                onClick={() => setActiveTab("attractions")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-widest transition-colors border-l border-border ${
                  activeTab === "attractions"
                    ? "bg-node-attraction text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Attractions
              </button>
            </div>

            {/* Inline search form */}
            <div className="border border-t-0 border-border rounded-b-sm bg-card overflow-hidden p-4">
              <AnimatePresence mode="wait">
                {activeTab === "flights" ? (
                  <motion.div key="flights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <LandingFlightForm navigate={navigate} />
                  </motion.div>
                ) : activeTab === "hotels" ? (
                  <motion.div key="hotels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <LandingHotelForm navigate={navigate} />
                  </motion.div>
                ) : (
                  <motion.div key="attractions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <LandingAttractionForm navigate={navigate} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features row */}
      <section className="border-t border-border bg-card/30 mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Map,
                title: "Smart Itineraries",
                desc: "Auto-generate day-by-day plans based on your flights, hotels, and interests.",
              },
              {
                icon: Users,
                title: "Collaborative Planning",
                desc: "Invite friends. Everyone edits the same itinerary in real-time.",
              },
              {
                icon: Shield,
                title: "Disruption Handling",
                desc: "Flight delayed? We rebook connections and adjust your entire schedule.",
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center mx-auto mb-3">
                  <feat.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-sm font-medium tracking-tight">{feat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-mono leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Landing inline forms ────────────────────────
function LandingFlightForm({ navigate }: { navigate: NavigateFunction }) {
  const [origin, setOrigin] = useState("SFO");
  const [destination, setDestination] = useState("NRT");
  const [date, setDate] = useState("2026-04-12");
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState("all");
  const airportCodes = Object.keys(airports);

  const handleSearch = () => {
    const params = new URLSearchParams({ type: "flights", origin, destination, date, passengers: String(passengers), cabin });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Origin</label>
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="form-select-style">
            {airportCodes.map((c) => <option key={c} value={c}>{c} — {airports[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Destination</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} className="form-select-style">
            {airportCodes.map((c) => <option key={c} value={c}>{c} — {airports[c]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-select-style" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Pax</label>
          <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="form-select-style">
            {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} {n === 1 ? "adult" : "adults"}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Cabin</label>
          <select value={cabin} onChange={(e) => setCabin(e.target.value)} className="form-select-style">
            <option value="all">All</option>
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
      </div>
      <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
        <Search className="w-3.5 h-3.5" /> Search Flights
      </Button>
    </div>
  );
}

function LandingHotelForm({ navigate }: { navigate: NavigateFunction }) {
  const [destination, setDestination] = useState("tokyo");
  const [checkIn, setCheckIn] = useState("2026-04-12");
  const [checkOut, setCheckOut] = useState("2026-04-15");
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const cityCodes = Object.keys(hotelCities);

  const handleSearch = () => {
    const params = new URLSearchParams({ type: "hotels", destination, checkIn, checkOut, guests: String(guests), rooms: String(rooms) });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Destination</label>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="form-select-style">
          {cityCodes.map((c) => <option key={c} value={c}>{hotelCities[c]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Check-in</label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="form-select-style" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Check-out</label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="form-select-style" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Guests</label>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="form-select-style">
            {[1,2,3,4].map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Rooms</label>
          <select value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="form-select-style">
            {[1,2,3,4].map((n) => <option key={n} value={n}>{n} {n === 1 ? "room" : "rooms"}</option>)}
          </select>
        </div>
      </div>
      <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
        <Search className="w-3.5 h-3.5" /> Search Hotels
      </Button>
    </div>
  );
}

function LandingAttractionForm({ navigate }: { navigate: NavigateFunction }) {
  const [city, setCity] = useState("tokyo");
  const [date, setDate] = useState("2026-04-12");
  const cityCodes = Object.keys(attractionCities);

  const handleSearch = () => {
    const params = new URLSearchParams({ type: "attractions", destination: city, date });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">City</label>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="form-select-style">
          {cityCodes.map((c) => <option key={c} value={c}>{attractionCities[c]}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-select-style" />
      </div>
      <Button variant="accent" size="sm" className="w-full" onClick={handleSearch}>
        <Search className="w-3.5 h-3.5" /> Search Attractions
      </Button>
    </div>
  );
}

export default Landing;
