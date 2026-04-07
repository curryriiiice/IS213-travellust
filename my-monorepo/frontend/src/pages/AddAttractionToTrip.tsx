import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  Loader2,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getUserTrips } from "@/api/trip";
import { saveCatalogAttraction } from "@/api/plan";
import type { AttractionOffer } from "@/data/attractionData";
import type { Trip } from "@/types/trip";

const CURRENT_USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

type AddAttractionState = {
  itemType: "attraction";
  data: AttractionOffer;
};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const AddAttractionToTrip = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as AddAttractionState | null;

  const [visitDate, setVisitDate] = useState(getTodayDate());
  const [visitTime, setVisitTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(
    String(state?.data.durationMinutes ?? 120)
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attraction = state?.data;

  useEffect(() => {
    const loadTrips = async () => {
      setIsLoadingTrips(true);
      setError(null);
      try {
        const fetchedTrips = await getUserTrips(CURRENT_USER_ID);
        setTrips(fetchedTrips);
        if (fetchedTrips.length > 0) {
          setSelectedTripId(fetchedTrips[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch user trips:", err);
        setTrips([]);
        setSelectedTripId("");
        setError("Could not load your real trips. Please make sure the trips service is running.");
      } finally {
        setIsLoadingTrips(false);
      }
    };

    loadTrips();
  }, []);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips]
  );

  const handleAddAttraction = async () => {
    if (!attraction) {
      toast({
        title: "Missing attraction",
        description: "No attraction was passed to this page.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTrip) {
      toast({
        title: "Select a trip",
        description: "Choose which trip you want to add this attraction to.",
        variant: "destructive",
      });
      return;
    }

    if (!visitDate) {
      toast({
        title: "Select a date",
        description: "Pick a visit date before saving the attraction.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveCatalogAttraction(selectedTrip.id, CURRENT_USER_ID, attraction, {
        visitDate,
        visitTime,
        durationMinutes: Number(durationMinutes) || attraction.durationMinutes || 120,
        cost: attraction.price,
      });
      toast({
        title: "Attraction added",
        description: `${attraction.name} was added to ${selectedTrip.name}.`,
      });
      navigate("/trips");
    } catch (err) {
      console.error("Failed to save attraction:", err);
      toast({
        title: "Failed to add attraction",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!attraction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">No attraction selected</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-card border border-border rounded-sm overflow-hidden"
        >
          <div className="h-56 bg-secondary flex items-center justify-center border-b border-border overflow-hidden">
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

          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-node-attraction" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-node-attraction">
                Add Attraction
              </span>
            </div>

            <h1 className="text-2xl font-medium tracking-tight">{attraction.name}</h1>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-node-attraction/30 text-node-attraction">
                {attraction.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {attraction.price === 0 ? "Free" : `$${attraction.price}`}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {attraction.durationMinutes} min
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-4">{attraction.description}</p>

            <div className="mt-5 pt-5 border-t border-border space-y-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{attraction.address}</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{attraction.bestTimeToVisit || attraction.openingHours || "See operator details"}</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="bg-card border border-border rounded-sm p-6 space-y-5"
        >
          <div>
            <h2 className="text-lg font-medium tracking-tight">Choose Trip</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a trip and visit date to save this attraction into your itinerary.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="visit-date" className="text-xs font-medium text-muted-foreground">
              Visit Date
            </label>
            <Input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(event) => setVisitDate(event.target.value)}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="visit-time" className="text-xs font-medium text-muted-foreground">
                Time
              </label>
              <Input
                id="visit-time"
                type="time"
                value={visitTime}
                onChange={(event) => setVisitTime(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="duration-minutes" className="text-xs font-medium text-muted-foreground">
                Duration (min)
              </label>
              <Input
                id="duration-minutes"
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Your Trips</div>

            {error && (
              <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded-sm p-2">
                {error}
              </div>
            )}

            {isLoadingTrips ? (
              <div className="space-y-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-16 rounded-sm border border-border bg-secondary/20 animate-pulse" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="border border-dashed border-border rounded-sm p-4 text-center">
                <p className="text-sm text-muted-foreground">No trips found for this user.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => {
                  const isSelected = trip.id === selectedTripId;
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => setSelectedTripId(trip.id)}
                      className={`w-full text-left rounded-sm border p-4 transition-colors ${
                        isSelected
                          ? "border-node-attraction bg-node-attraction/10"
                          : "border-border bg-secondary/20 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{trip.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {trip.destination}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {trip.startDate || "No start date"}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {(trip.nodes?.length ?? 0)} items
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Selected trip</p>
              <p className="text-sm font-medium truncate">{selectedTrip?.name ?? "None selected"}</p>
            </div>
            <Button
              variant="accent"
              size="lg"
              onClick={handleAddAttraction}
              disabled={isSaving || isLoadingTrips || !selectedTrip}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add to Trip
                </>
              )}
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AddAttractionToTrip;
