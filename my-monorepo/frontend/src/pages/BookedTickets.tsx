import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBookings, type BookingRecord } from "@/contexts/BookingsContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Compass,
  Plane,
  Building2,
  MapPin,
  Ticket,
  Calendar,
  Users,
  User,
} from "lucide-react";

type Filter = "all" | "flight" | "hotel" | "attraction";

const BookedTickets = () => {
  const navigate = useNavigate();
  const { bookings } = useBookings();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.itemType === filter);

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "flight") return <Plane className="w-4 h-4 text-node-flight" />;
    if (type === "hotel") return <Building2 className="w-4 h-4 text-node-hotel" />;
    return <MapPin className="w-4 h-4 text-node-attraction" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium tracking-tight">TravelLust</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/")}>
            Home
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/profile")}>
            <User className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-semibold tracking-tight">Booked Tickets</h1>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all" className="text-xs gap-1.5">
              All
              <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-sm tabular-nums">
                {bookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="flight" className="text-xs gap-1.5">
              <Plane className="w-3 h-3" /> Flights
              <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-sm tabular-nums">
                {bookings.filter((b) => b.itemType === "flight").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="hotel" className="text-xs gap-1.5">
              <Building2 className="w-3 h-3" /> Hotels
              <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-sm tabular-nums">
                {bookings.filter((b) => b.itemType === "hotel").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="attraction" className="text-xs gap-1.5">
              <MapPin className="w-3 h-3" /> Attractions
              <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-sm tabular-nums">
                {bookings.filter((b) => b.itemType === "attraction").length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Booking List */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 space-y-3"
            >
              <Ticket className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? "No bookings yet. Start by booking a flight or hotel!"
                  : `No ${filter} bookings yet.`}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                Browse & Book
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-sm p-4 hover:border-accent/30 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate("/details", {
                      state: { itemType: booking.itemType === "attraction" ? "node" : booking.itemType, data: booking.data, fromBookings: true },
                    })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-sm bg-muted">
                        <TypeIcon type={booking.itemType} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{booking.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{booking.subtitle}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.bookedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {booking.passengerCount} {booking.passengerCount > 1 ? "guests" : "guest"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono tabular-nums font-medium">
                        ${booking.totalPrice.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-node-hotel mt-1 font-medium">Confirmed</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookedTickets;
