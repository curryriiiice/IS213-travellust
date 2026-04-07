import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBookings, type BookingRecord } from "@/contexts/BookingsContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserBookedTickets } from "@/api/booking";
import { fetchFlightById } from "@/api/flight";
import { fetchHotelById } from "@/api/hotel";
import { fetchAttractionById } from "@/api/attraction";
import { fetchTripById } from "@/api/trip";
import type { Trip } from "@/types/trip";
import { Loader2 } from "lucide-react";
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
  RefreshCw,
} from "lucide-react";

type Filter = "all" | "flight" | "hotel" | "attraction";

const BookedTickets = () => {
  const navigate = useNavigate();
  const { bookings, setBookings } = useBookings();
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Get current user ID from localStorage or use a default for development
  // TODO: Integrate with proper authentication when available
  const getCurrentUserId = (): string => {
    const stored = localStorage.getItem("userId");
    if (stored) return stored;
    // Development fallback - should be replaced with actual auth
    return "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  };

  // Format booking date and time as "MMM D, YYYY · HH:mm"
  const formatBookingDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " · " + date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  // Helper to clear bookings cache
  const clearBookingsCache = () => {
    const cacheKey = `booked_tickets_${getCurrentUserId()}`;
    sessionStorage.removeItem(cacheKey);
  };

  // Safe fetch wrapper to suppress console errors during ticket resolution
  const safeFetch = async (
    fetchFn: (id: string) => Promise<any>,
    id: string
  ): Promise<any> => {
    try {
      return await fetchFn(id);
    } catch (error) {
      // Suppress errors during resolution - expected as we try all three services
      return null;
    }
  };

  // Fetch and resolve booked tickets on component mount
  useEffect(() => {
    const fetchAndResolveBookings = async () => {
      // Skip cache if force refresh is requested
      const cacheKey = `booked_tickets_${getCurrentUserId()}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      if (!forceRefresh && cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setBookings(data);
            setIsLoading(false);
            setHasLoaded(true);
            // Still fetch fresh data in background
          }
        } catch (e) {
          console.error("Error parsing cache:", e);
        }
      }

      try {
        const userId = getCurrentUserId();

        const bookedTickets = await getUserBookedTickets(userId);

        if (bookedTickets.length === 0) {
          setIsLoading(false);
          setHasLoaded(true);
          sessionStorage.removeItem(cacheKey); // Clear cache if no tickets
          return;
        }

        // Simple cache for trip details to avoid duplicate fetches
        const tripCache = new Map<string, Trip>();

        const getTripMemberCount = async (tripId: string): Promise<number> => {
          if (tripCache.has(tripId)) {
            const trip = tripCache.get(tripId)!;
            return trip.member_ids?.length || 1;
          }

          const trip = await fetchTripById(tripId);
          if (trip) {
            tripCache.set(tripId, trip);
            return trip.member_ids?.length || 1;
          }
          return 1;
        };

        const getBookingDateTime = (itemType: string, data: any): string => {
          // Extract proper datetime from the resolved data
          if (itemType === "flight" && data.details?.datetime_departure) {
            return data.details.datetime_departure;
          } else if (itemType === "hotel" && data.details?.datetime_check_in) {
            return data.details.datetime_check_in;
          } else if (itemType === "attraction" && data.details?.visit_time) {
            return data.details.visit_time;
          } else if (itemType === "attraction" && data.rawVisitTime) {
            return data.rawVisitTime;
          }
          return new Date().toISOString();
        };

        // Resolve each ticket by trying to fetch from all services
        const resolvedBookings: BookingRecord[] = await Promise.all(
          bookedTickets.map(async (ticket) => {
            const { booked_ticket_id, f_h_a_id, cost } = ticket;

            // Try to fetch from all services in parallel using safeFetch
            const [flight, hotel, attraction] = await Promise.all([
              safeFetch(fetchFlightById, f_h_a_id),
              safeFetch(fetchHotelById, f_h_a_id),
              safeFetch(fetchAttractionById, f_h_a_id),
            ]);

            // Determine which service returned valid data
            if (flight) {
              const tripId = flight.details?.trip_id;
              const memberCount = tripId ? await getTripMemberCount(tripId) : 1;
              const bookingDateTime = getBookingDateTime("flight", flight);

              return {
                id: booked_ticket_id.toString(),
                itemType: "flight" as const,
                title: flight.title,
                subtitle: flight.subtitle,
                totalPrice: cost || flight.cost,
                passengerCount: memberCount,
                bookedAt: bookingDateTime,
                data: { ...flight, status: "confirmed" },
              };
            } else if (hotel) {
              const tripId = hotel.details?.trip_id;
              const memberCount = tripId ? await getTripMemberCount(tripId) : 1;
              const bookingDateTime = getBookingDateTime("hotel", hotel);

              return {
                id: booked_ticket_id.toString(),
                itemType: "hotel" as const,
                title: hotel.title,
                subtitle: hotel.subtitle,
                totalPrice: cost || hotel.cost,
                passengerCount: memberCount,
                bookedAt: bookingDateTime,
                data: { ...hotel, status: "confirmed" },
              };
            } else if (attraction) {
              const tripId = attraction.details?.trip_id;
              const memberCount = tripId ? await getTripMemberCount(tripId) : 1;
              const bookingDateTime = getBookingDateTime("attraction", attraction);

              return {
                id: booked_ticket_id.toString(),
                itemType: "attraction" as const,
                title: attraction.title,
                subtitle: attraction.subtitle,
                totalPrice: cost || attraction.cost,
                passengerCount: memberCount,
                bookedAt: bookingDateTime,
                data: { ...attraction, status: "confirmed" },
              };
            }

            // If no service returned valid data, skip this ticket
            return null;
          })
        );

        // Filter out null bookings and update context
        const validBookings = resolvedBookings.filter(
          (booking): booking is BookingRecord => booking !== null
        );

        setBookings(validBookings);

        // Cache the results for future instant loads
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: validBookings,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error("Error caching bookings:", e);
        }
      } catch (error) {
        console.error("Error fetching and resolving bookings:", error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchAndResolveBookings();
  }, [hasLoaded, setBookings, forceRefresh]);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-accent" />
              <h1 className="text-xl font-semibold tracking-tight">Booked Tickets</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              clearBookingsCache();
              setForceRefresh(prev => !prev);
            }}
            title="Refresh bookings"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
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
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 space-y-3"
            >
              <Loader2 className="w-8 h-8 text-muted-foreground/40 mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground">Loading your bookings...</p>
            </motion.div>
          ) : filtered.length === 0 ? (
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
                      state: { itemType: "node", data: booking.data, tripId: booking.data.details?.trip_id, fromBookings: true },
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
                            {formatBookingDateTime(booking.bookedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {booking.passengerCount} {booking.passengerCount > 1 ? "members" : "member"}
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
