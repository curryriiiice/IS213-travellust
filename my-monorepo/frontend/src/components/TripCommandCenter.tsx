import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TimelineNode } from "./TimelineNode";
import { DetailPane } from "./DetailPane";
import { LedgerPane } from "./LedgerPane";
import { BudgetBar } from "./BudgetBar";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import type { Trip, ItineraryNode } from "@/types/trip";
import { ChevronLeft, Settings, Share2, Plus, Plane, Building2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { fetchFlightById } from "@/api/flight";
import { fetchHotelById } from "@/api/hotel";
import { fetchAttractionsByTripId } from "@/api/attraction";
import { getUserBookedTickets } from "@/api/booking";

interface TripCommandCenterProps {
  trip: Trip;
  onBack: () => void;
  onUpdateTrip?: (trip: Trip) => void;
}

export function TripCommandCenter({ trip, onBack, onUpdateTrip }: TripCommandCenterProps) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<ItineraryNode | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [enrichedNodes, setEnrichedNodes] = useState<ItineraryNode[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // Add node form state
  const [nodeType, setNodeType] = useState<"flight" | "hotel" | "attraction">("flight");
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeSubtitle, setNodeSubtitle] = useState("");
  const [nodeDate, setNodeDate] = useState("");
  const [nodeTime, setNodeTime] = useState("09:00");
  const [nodeCost, setNodeCost] = useState("");
  const [nodeDuration, setNodeDuration] = useState("");

  const resetForm = () => {
    setNodeTitle("");
    setNodeSubtitle("");
    setNodeDate("");
    setNodeTime("09:00");
    setNodeCost("");
    setNodeDuration("");
    setNodeType("flight");
  };

  // Enrich trip details from microservices when trip changes
  useEffect(() => {
    const enrichTripDetails = async () => {
      if (!trip.id) return;

      console.log("Enriching trip:", trip.id);
      console.log("Trip IDs - flights:", trip.flight_ids, "hotels:", trip.hotel_ids, "attractions:", trip.attraction_ids);

      setIsEnriching(true);
      const fetchedNodes: ItineraryNode[] = [];

      // Get the IDs for each item type from the trip
      const flightIds = trip.flight_ids || [];
      const hotelIds = trip.hotel_ids || [];
      const attractionIds = trip.attraction_ids || [];

      // If we have manual nodes, start with those
      if (trip.nodes && trip.nodes.length > 0) {
        fetchedNodes.push(...trip.nodes);
      }

      // Fetch all flight details in parallel
      if (flightIds.length > 0) {
        const flightPromises = flightIds.map((id: string) =>
          fetchFlightById(id, trip.currency)
        );
        const flightResults = await Promise.allSettled(flightPromises);
        flightResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            fetchedNodes.push(result.value);
          } else if (result.status === "rejected") {
            console.error("Flight fetch failed:", result.reason);
          }
        });
      }

      // Fetch all hotel details in parallel
      if (hotelIds.length > 0) {
        const hotelPromises = hotelIds.map((id: string) =>
          fetchHotelById(id, trip.currency)
        );
        const hotelResults = await Promise.allSettled(hotelPromises);
        hotelResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            fetchedNodes.push(result.value);
          } else if (result.status === "rejected") {
            console.error("Hotel fetch failed:", result.reason);
          }
        });
      }

      // Fetch all attractions for the trip in one call
      if (attractionIds.length > 0) {
        const attractions = await fetchAttractionsByTripId(trip.id, trip.currency);
        console.log("Fetched attractions:", attractions.length);
        fetchedNodes.push(...attractions);
      }

      // Fetch user's real bookings and mark nodes confirmed where a matching ticket exists
      const CURRENT_USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
      const userTickets = await getUserBookedTickets(CURRENT_USER_ID);
      const bookedIds = new Set(userTickets.map((t) => t.f_h_a_id));

      const resolvedNodes = fetchedNodes.map((node) =>
        bookedIds.has(node.id) ? { ...node, status: "confirmed" as const } : node
      );

      // Sort all items by date, then by time
      resolvedNodes.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      console.log("Total enriched nodes:", resolvedNodes.length, "| Booked IDs:", bookedIds.size);
      setEnrichedNodes(resolvedNodes);
      setIsEnriching(false);
    };

    enrichTripDetails();
  }, [trip.id, trip.currency, trip.nodes, trip.flight_ids, trip.hotel_ids, trip.attraction_ids]);

  // Use enriched nodes (always use after enrichment completes)
  // During enrichment, show original trip nodes as placeholder
  const nodesToDisplay = isEnriching ? trip.nodes : enrichedNodes;
  console.log("Displaying nodes:", nodesToDisplay.length, "isEnriching:", isEnriching);

  const handleAddNode = () => {
    if (!nodeTitle || !nodeDate) return;
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
    const updatedTrip = {
      ...trip,
      nodes: [...trip.nodes, newNode],
      spent: trip.spent + (Number(nodeCost) || 0),
    };
    onUpdateTrip?.(updatedTrip);
    toast({ title: "Node added", description: `${nodeTitle} added to itinerary` });
    setAddNodeOpen(false);
    resetForm();
  };

  // Group nodes by date
  const nodesByDate = nodesToDisplay.reduce(
    (acc, node) => {
      if (!acc[node.date]) acc[node.date] = [];
      acc[node.date].push(node);
      return acc;
    },
    {} as Record<string, ItineraryNode[]>
  );

  const typeConfig = {
    flight: { icon: Plane, label: "Flight", color: "bg-accent text-accent-foreground" },
    hotel: { icon: Building2, label: "Hotel", color: "bg-node-hotel text-accent-foreground" },
    attraction: { icon: MapPin, label: "Attraction", color: "bg-node-attraction text-accent-foreground" },
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-medium tracking-tight">{trip.name}</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              {trip.destination} · {trip.startDate} → {trip.endDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CollaboratorAvatars collaborators={trip.collaborators} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setAddNodeOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Timeline */}
        <div className="w-80 shrink-0 pane-border flex flex-col bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Itinerary · {nodesToDisplay.length} nodes
              {isEnriching && (
                <Loader2 className="w-3 h-3 ml-1 animate-spin inline" />
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setAddNodeOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.entries(nodesByDate).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">No items yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setAddNodeOpen(true)}
                >
                  Add your first item
                </Button>
              </div>
            )}
            {Object.entries(nodesByDate).map(([date, nodes]) => (
              <div key={date}>
                <div className="px-4 py-2 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {nodes.map((node) => (
                  <TimelineNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    onClick={(n) => {
                      setSelectedNode(n);
                      navigate("/details", {
                        state: {
                          itemType: "node",
                          data: n,
                          tripId: trip.id,
                          memberIds: trip.member_ids ?? [],
                        },
                      });
                    }}
                    isFirst={false}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Calculate total spent from enriched nodes */}
          {(() => {
            const totalSpent = nodesToDisplay.reduce((sum, node) => sum + (node.cost || 0), 0);
            return <BudgetBar budget={trip.budget} spent={totalSpent} currency={trip.currency} />;
          })()}
        </div>

        {/* Center: Detail view */}
        <div className="flex-1 pane-border flex flex-col">
          <DetailPane node={selectedNode} />
        </div>

        {/* Right: Ledger & Social */}
        <div className="w-80 shrink-0 bg-card overflow-y-auto">
          <LedgerPane trip={trip} />
        </div>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-tight">Add to Itinerary</DialogTitle>
          </DialogHeader>

          {/* Type selector */}
          <div className="flex gap-2">
            {(["flight", "hotel", "attraction"] as const).map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNodeType(type)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
                    nodeType === type ? cfg.color : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                Title
              </label>
              <input
                className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={nodeType === "flight" ? "SFO → NRT" : nodeType === "hotel" ? "Hotel name" : "Attraction name"}
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                Subtitle
              </label>
              <input
                className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={nodeType === "flight" ? "Japan Airlines JL001" : nodeType === "hotel" ? "Shibuya, Tokyo" : "Guided tour"}
                value={nodeSubtitle}
                onChange={(e) => setNodeSubtitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  value={nodeDate}
                  onChange={(e) => setNodeDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Time
                </label>
                <input
                  type="time"
                  className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  value={nodeTime}
                  onChange={(e) => setNodeTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Cost ({trip.currency})
                </label>
                <input
                  type="number"
                  className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="0"
                  value={nodeCost}
                  onChange={(e) => setNodeCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                  Duration
                </label>
                <input
                  className="w-full h-9 bg-secondary border border-border rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="2h 30m"
                  value={nodeDuration}
                  onChange={(e) => setNodeDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => { setAddNodeOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleAddNode}
              disabled={!nodeTitle || !nodeDate}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add {typeConfig[nodeType].label}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
