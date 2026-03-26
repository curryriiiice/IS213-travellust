import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TimelineNode } from "./TimelineNode";
import { DetailPane } from "./DetailPane";
import { LedgerPane } from "./LedgerPane";
import { BudgetBar } from "./BudgetBar";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import { ActivityLog } from "./ActivityLog";
import { useCollaborationSocket, TripUpdateEvent } from "@/hooks/useCollaborationSocket";
import type { Trip, ItineraryNode, Collaborator } from "@/types/trip";
import { ChevronLeft, Settings, Share2, Plus, Plane, Building2, MapPin, Clock, Receipt, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Current user — in a real app this comes from auth context
const CURRENT_USER_ID = "u1";
const CURRENT_USER_NAME = "You";

interface TripCommandCenterProps {
  trip: Trip;
  onBack: () => void;
  onUpdateTrip?: (trip: Trip) => void;
}

type RightTab = "ledger" | "activity";

export function TripCommandCenter({ trip, onBack, onUpdateTrip }: TripCommandCenterProps) {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<ItineraryNode[]>(trip.nodes);
  const [selectedNode, setSelectedNode] = useState<ItineraryNode | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("ledger");

  // Add node form state
  const [nodeType, setNodeType] = useState<"flight" | "hotel" | "attraction">("flight");
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeSubtitle, setNodeSubtitle] = useState("");
  const [nodeDate, setNodeDate] = useState("");
  const [nodeTime, setNodeTime] = useState("09:00");
  const [nodeCost, setNodeCost] = useState("");
  const [nodeDuration, setNodeDuration] = useState("");

  // Handle incoming real-time trip updates from other users
  const handleTripUpdate = useCallback(
    (event: TripUpdateEvent & { user_id: string | null }) => {
      // Skip our own events (already applied optimistically)
      if (event.user_id === CURRENT_USER_ID) return;

      const { type, data } = event;

      if (type.endsWith("_ADDED")) {
        const incoming = data as Partial<ItineraryNode>;
        if (!incoming.id) return;
        setNodes((prev) => {
          if (prev.some((n) => n.id === incoming.id)) return prev;
          return [...prev, incoming as ItineraryNode];
        });
        toast({ title: "New item added", description: incoming.title ?? "A collaborator added an item" });
      } else if (type.endsWith("_UPDATED")) {
        const incoming = data as Partial<ItineraryNode> & { flight_id?: string };
        const targetId = incoming.id ?? incoming.flight_id;
        if (!targetId) return;
        setNodes((prev) =>
          prev.map((n) => (n.id === targetId ? { ...n, ...incoming } : n))
        );
      } else if (type.endsWith("_DELETED")) {
        const incoming = data as { node_id?: string; flight_id?: string; hotel_id?: string };
        const targetId = incoming.node_id ?? incoming.flight_id ?? incoming.hotel_id;
        if (!targetId) return;
        setNodes((prev) => prev.filter((n) => n.id !== targetId));
      }
    },
    []
  );

  const { activeUserIds, activityLog, isConnected } = useCollaborationSocket(
    trip.id,
    CURRENT_USER_ID,
    { onTripUpdate: handleTripUpdate }
  );

  // Build live collaborator list — mark online based on socket active users
  const liveCollaborators: Collaborator[] = trip.collaborators.map((c) => ({
    ...c,
    isOnline: activeUserIds.includes(c.id),
  }));

  const resetForm = () => {
    setNodeTitle("");
    setNodeSubtitle("");
    setNodeDate("");
    setNodeTime("09:00");
    setNodeCost("");
    setNodeDuration("");
    setNodeType("flight");
  };

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

    // Optimistic update
    setNodes((prev) => [...prev, newNode]);

    const updatedTrip = {
      ...trip,
      nodes: [...nodes, newNode],
      spent: trip.spent + (Number(nodeCost) || 0),
    };
    onUpdateTrip?.(updatedTrip);

    toast({ title: "Node added", description: `${nodeTitle} added to itinerary` });
    setAddNodeOpen(false);
    resetForm();
  };

  // Derived trip with live nodes for ledger
  const liveTrip: Trip = { ...trip, nodes };

  // Group nodes by date
  const nodesByDate = nodes.reduce(
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
          {/* Connection indicator */}
          <span title={isConnected ? "Live" : "Offline"}>
            {isConnected
              ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
          </span>
          <CollaboratorAvatars collaborators={liveCollaborators} />
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
              Itinerary · {nodes.length} nodes
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
            {Object.entries(nodesByDate).map(([date, dateNodes]) => (
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
                {dateNodes.map((node) => (
                  <TimelineNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    onClick={(n) => {
                      setSelectedNode(n);
                      navigate("/details", { state: { itemType: "node", data: n } });
                    }}
                    isFirst={false}
                  />
                ))}
              </div>
            ))}
          </div>
          <BudgetBar budget={trip.budget} spent={trip.spent} currency={trip.currency} />
        </div>

        {/* Center: Detail view */}
        <div className="flex-1 pane-border flex flex-col">
          <DetailPane node={selectedNode} />
        </div>

        {/* Right: Tabbed — Ledger / Activity */}
        <div className="w-80 shrink-0 bg-card flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setRightTab("ledger")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                rightTab === "ledger"
                  ? "text-foreground border-b-2 border-accent -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="w-3 h-3" /> Ledger
            </button>
            <button
              onClick={() => setRightTab("activity")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors relative ${
                rightTab === "activity"
                  ? "text-foreground border-b-2 border-accent -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-3 h-3" /> Activity
              {activityLog.length > 0 && rightTab !== "activity" && (
                <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightTab === "ledger" ? (
              <LedgerPane trip={liveTrip} />
            ) : (
              <ActivityLog entries={activityLog} />
            )}
          </div>
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
