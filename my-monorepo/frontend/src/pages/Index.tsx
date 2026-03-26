import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { TripCard } from "@/components/TripCard";
import { TripCommandCenter } from "@/components/TripCommandCenter";
import { mockCollaborators } from "@/data/mockData";
import { tripsApi } from "@/services/tripsApi";
import type { Trip, ItineraryNode, Collaborator } from "@/types/trip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Compass,
  Plane,
  Building2,
  MapPin,
  UserPlus,
  UserMinus,
  CalendarIcon,
  DollarSign,
  MapPinIcon,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Current user — in a real app this comes from auth context
const CURRENT_USER_ID = "u1";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [addNodeTripId, setAddNodeTripId] = useState<string | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabTripId, setCollabTripId] = useState<string | null>(null);
  const [newTripOpen, setNewTripOpen] = useState(false);

  // Add node form state
  const [nodeType, setNodeType] = useState<"flight" | "hotel" | "attraction">("flight");
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeSubtitle, setNodeSubtitle] = useState("");
  const [nodeDate, setNodeDate] = useState("");
  const [nodeTime, setNodeTime] = useState("09:00");
  const [nodeCost, setNodeCost] = useState("");
  const [nodeDuration, setNodeDuration] = useState("");

  // New trip form state
  const [tripName, setTripName] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>();
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>();
  const [tripBudget, setTripBudget] = useState("");
  const [tripCurrency, setTripCurrency] = useState("USD");
  const [tripCollaborators, setTripCollaborators] = useState<Collaborator[]>([mockCollaborators[0]]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const { data: trips = [], isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: tripsApi.getAll,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const createTripMutation = useMutation({
    mutationFn: tripsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip created", description: `${created.name} — ${created.destination}` });
      setNewTripOpen(false);
      resetNewTripForm();
    },
    onError: () => toast({ title: "Failed to create trip", variant: "destructive" }),
  });

  const updateTripMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Trip> }) =>
      tripsApi.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
    onError: () => toast({ title: "Failed to update trip", variant: "destructive" }),
  });


  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const resetNewTripForm = () => {
    setTripName("");
    setTripDestination("");
    setTripStartDate(undefined);
    setTripEndDate(undefined);
    setTripBudget("");
    setTripCurrency("USD");
    setTripCollaborators([mockCollaborators[0]]);
  };

  const handleCreateTrip = () => {
    if (!tripName || !tripDestination || !tripStartDate || !tripEndDate) return;
    createTripMutation.mutate({
      name: tripName,
      destination: tripDestination,
      startDate: format(tripStartDate, "yyyy-MM-dd"),
      endDate: format(tripEndDate, "yyyy-MM-dd"),
      budget: Number(tripBudget) || 0,
      spent: 0,
      currency: tripCurrency,
      collaborators: tripCollaborators,
      nodes: [],
    });
  };

  const toggleTripCollab = (collab: Collaborator) => {
    if (collab.id === CURRENT_USER_ID) return;
    setTripCollaborators((prev) =>
      prev.some((c) => c.id === collab.id)
        ? prev.filter((c) => c.id !== collab.id)
        : [...prev, collab]
    );
  };

  const handleAddNode = () => {
    if (!addNodeTripId || !nodeTitle || !nodeDate) return;
    const trip = trips.find((t) => t.id === addNodeTripId);
    if (!trip) return;

    const newNode: ItineraryNode = {
      id: `n-${Date.now()}`,
      type: nodeType,
      title: nodeTitle,
      subtitle: nodeSubtitle,
      date: nodeDate,
      time: nodeTime,
      duration: nodeDuration || undefined,
      cost: Number(nodeCost) || 0,
      currency: trip.currency,
      status: "pending",
      details: {},
    };

    updateTripMutation.mutate({
      id: addNodeTripId,
      patch: {
        nodes: [...trip.nodes, newNode],
        spent: trip.spent + (Number(nodeCost) || 0),
      },
    });

    toast({ title: "Node added", description: `${nodeTitle} added to trip` });
    setAddNodeOpen(false);
    resetNodeForm();
  };

  const resetNodeForm = () => {
    setNodeTitle("");
    setNodeSubtitle("");
    setNodeDate("");
    setNodeTime("09:00");
    setNodeCost("");
    setNodeDuration("");
    setNodeType("flight");
  };

  const openAddNode = (tripId: string) => {
    setAddNodeTripId(tripId);
    setAddNodeOpen(true);
  };

  const openCollabManager = (tripId: string) => {
    setCollabTripId(tripId);
    setCollabOpen(true);
  };

  const collabTrip = trips.find((t) => t.id === collabTripId);
  const availableCollabs = mockCollaborators.filter(
    (c) => !collabTrip?.collaborators.some((tc) => tc.id === c.id)
  );

  const addCollaborator = (collab: Collaborator) => {
    if (!collabTripId || !collabTrip) return;
    const updated = [...collabTrip.collaborators, collab];
    updateTripMutation.mutate({ id: collabTripId, patch: { collaborators: updated } });
    toast({ title: "Collaborator added", description: `${collab.name} joined the trip` });
  };

  const removeCollaborator = (collabId: string) => {
    if (!collabTripId || !collabTrip) return;
    const updated = collabTrip.collaborators.filter((c) => c.id !== collabId);
    updateTripMutation.mutate({ id: collabTripId, patch: { collaborators: updated } });
    toast({ title: "Collaborator removed" });
  };

  const handleUpdateTrip = (updated: Trip) => {
    updateTripMutation.mutate({ id: updated.id, patch: updated });
  };

  // ---------------------------------------------------------------------------
  // Trip command center view
  // ---------------------------------------------------------------------------
  if (selectedTrip) {
    const liveTrip = trips.find((t) => t.id === selectedTrip.id) ?? selectedTrip;
    return (
      <TripCommandCenter
        trip={liveTrip}
        onBack={() => setSelectedTrip(null)}
        onUpdateTrip={handleUpdateTrip}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Could not load trips. Is the trips service running?</p>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["trips"] })}>
          Retry
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main trips list
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Compass className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium tracking-tight">TravelLust</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setNewTripOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            New Trip
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="mb-6">
            <h1 className="text-xl font-medium tracking-tight">Your Trips</h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {trips.length} itineraries · {trips.reduce((s, t) => s + t.collaborators.length, 0)} collaborators active
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trips.map((trip) => (
              <div key={trip.id} className="relative group">
                <TripCard trip={trip} onClick={setSelectedTrip} />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 bg-card/90 backdrop-blur-sm"
                    onClick={(e) => { e.stopPropagation(); openAddNode(trip.id); }}
                    title="Add node"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 bg-card/90 backdrop-blur-sm"
                    onClick={(e) => { e.stopPropagation(); openCollabManager(trip.id); }}
                    title="Manage collaborators"
                  >
                    <UserPlus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            <motion.div
              whileHover={{ y: -2 }}
              className="border border-dashed border-border rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer node-interactive min-h-[160px]"
              onClick={() => setNewTripOpen(true)}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Create Trip</span>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* New Trip Dialog                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={newTripOpen} onOpenChange={(open) => { setNewTripOpen(open); if (!open) resetNewTripForm(); }}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Create New Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Trip Name</label>
              <input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Tokyo Sprint" className="form-select-style" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                <MapPinIcon className="w-3 h-3 inline mr-1" />Destination
              </label>
              <input value={tripDestination} onChange={(e) => setTripDestination(e.target.value)} placeholder="Tokyo, Japan" className="form-select-style" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-xs bg-secondary border-border", !tripStartDate && "text-muted-foreground")}>
                      {tripStartDate ? format(tripStartDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={tripStartDate} onSelect={setTripStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-xs bg-secondary border-border", !tripEndDate && "text-muted-foreground")}>
                      {tripEndDate ? format(tripEndDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={tripEndDate} onSelect={setTripEndDate} disabled={(date) => tripStartDate ? date < tripStartDate : false} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                  <DollarSign className="w-3 h-3 inline mr-1" />Budget
                </label>
                <input type="number" value={tripBudget} onChange={(e) => setTripBudget(e.target.value)} placeholder="5000" className="form-select-style" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Currency</label>
                <select value={tripCurrency} onChange={(e) => setTripCurrency(e.target.value)} className="form-select-style">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-2">
                <UserPlus className="w-3 h-3 inline mr-1" />Collaborators
              </label>
              <div className="space-y-1">
                {mockCollaborators.map((c) => {
                  const isSelected = tripCollaborators.some((tc) => tc.id === c.id);
                  const isSelf = c.id === CURRENT_USER_ID;
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleTripCollab(c)}
                      disabled={isSelf}
                      className={cn(
                        "w-full flex items-center gap-2 py-1.5 px-2 rounded-sm transition-colors",
                        isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-secondary/50 border border-transparent",
                        isSelf && "opacity-70 cursor-default"
                      )}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background shrink-0" style={{ backgroundColor: c.color }}>
                        {c.initials}
                      </div>
                      <span className="text-xs flex-1 text-left">{c.name}</span>
                      {isSelf && <span className="text-[10px] text-muted-foreground font-mono">you</span>}
                      {isSelected && !isSelf && (
                        <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Plus className="w-2.5 h-2.5 text-accent-foreground rotate-45" />
                        </span>
                      )}
                      {!isSelected && !isSelf && <UserPlus className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              variant="accent"
              size="sm"
              className="w-full"
              onClick={handleCreateTrip}
              disabled={!tripName || !tripDestination || !tripStartDate || !tripEndDate || createTripMutation.isPending}
            >
              {createTripMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Add Node Dialog                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Add to Itinerary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex border border-border rounded-sm overflow-hidden">
              {([
                { key: "flight" as const, icon: Plane, label: "Flight" },
                { key: "hotel" as const, icon: Building2, label: "Hotel" },
                { key: "attraction" as const, icon: MapPin, label: "Attraction" },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setNodeType(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                    nodeType === key
                      ? key === "flight" ? "bg-node-flight text-accent-foreground"
                        : key === "hotel" ? "bg-node-hotel text-accent-foreground"
                        : "bg-node-attraction text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  } ${key !== "flight" ? "border-l border-border" : ""}`}
                >
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Title</label>
              <input value={nodeTitle} onChange={(e) => setNodeTitle(e.target.value)} placeholder={nodeType === "flight" ? "SQ 638" : nodeType === "hotel" ? "Park Hyatt Tokyo" : "Tsukiji Market"} className="form-select-style" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Subtitle</label>
              <input value={nodeSubtitle} onChange={(e) => setNodeSubtitle(e.target.value)} placeholder={nodeType === "flight" ? "SFO → NRT" : "Shinjuku, Tokyo"} className="form-select-style" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Date</label>
                <input type="date" value={nodeDate} onChange={(e) => setNodeDate(e.target.value)} className="form-select-style" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Time</label>
                <input type="time" value={nodeTime} onChange={(e) => setNodeTime(e.target.value)} className="form-select-style" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Cost (USD)</label>
                <input type="number" value={nodeCost} onChange={(e) => setNodeCost(e.target.value)} placeholder="0" className="form-select-style" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Duration</label>
                <input value={nodeDuration} onChange={(e) => setNodeDuration(e.target.value)} placeholder="2h 30m" className="form-select-style" />
              </div>
            </div>
            <Button
              variant="accent"
              size="sm"
              className="w-full"
              onClick={handleAddNode}
              disabled={!nodeTitle || !nodeDate || updateTripMutation.isPending}
            >
              {updateTripMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Collaborator Manager Dialog                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Manage Collaborators</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Current</span>
              <div className="mt-2 space-y-1">
                {collabTrip?.collaborators.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background" style={{ backgroundColor: c.color }}>{c.initials}</div>
                      <span className="text-xs">{c.name}</span>
                      {c.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-node-hotel" />}
                    </div>
                    {c.id !== CURRENT_USER_ID && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => removeCollaborator(c.id)}>
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {availableCollabs.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Add</span>
                <div className="mt-2 space-y-1">
                  {availableCollabs.map((c) => (
                    <button key={c.id} onClick={() => addCollaborator(c)} className="w-full flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-secondary/50 transition-colors">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background" style={{ backgroundColor: c.color }}>{c.initials}</div>
                      <span className="text-xs text-muted-foreground">{c.name}</span>
                      <UserPlus className="w-3 h-3 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
