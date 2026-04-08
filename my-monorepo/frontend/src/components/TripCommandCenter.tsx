import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TimelineNode } from "./TimelineNode";
import { DetailPane } from "./DetailPane";
import { LedgerPane } from "./LedgerPane";
import { BudgetBar } from "./BudgetBar";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import type { Trip, ItineraryNode, Collaborator } from "@/types/trip";
import { ChevronLeft, Settings, Share2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchFlightById } from "@/api/flight";
import { fetchHotelById } from "@/api/hotel";
import { fetchAttractionsByTripId } from "@/api/attraction";
import { getUserBookedTickets } from "@/api/booking";
import {
  deleteFlight,
  deleteHotel,
  deletePlannedAttraction,
} from "@/api/plan";
import { useCollabSocket } from "@/hooks/useCollabSocket";
import { getCurrentUserId } from "@/lib/auth";
import { fetchAllClients } from "@/api/collaborator";
import { getInitials, getColorFromUuid } from "@/lib/collaborator-utils";

interface TripCommandCenterProps {
  trip: Trip;
  onBack: () => void;
}

const CURRENT_USER_ID = getCurrentUserId();

export function TripCommandCenter({ trip, onBack }: TripCommandCenterProps) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<ItineraryNode | null>(null);
  const [enrichedNodes, setEnrichedNodes] = useState<ItineraryNode[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  const sortNodes = (nodes: ItineraryNode[]) =>
    [...nodes].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.time.localeCompare(b.time);
    });

  const handleTripUpdate = useCallback(
    async (event: { type: string; data: Record<string, unknown> }) => {
      const { type, data } = event;
      const itemId = (data?.id ?? data?.flight_id ?? data?.hotel_id ?? data?.attraction_id) as string | undefined;

      if (type === "FLIGHT_ADDED" && itemId) {
        const node = await fetchFlightById(itemId, trip.currency).catch(() => null);
        if (node) setEnrichedNodes((prev) => sortNodes([...prev, node]));
      } else if (type === "FLIGHT_DELETED" && itemId) {
        setEnrichedNodes((prev) => prev.filter((n) => n.id !== itemId));
      } else if (type === "HOTEL_ADDED" && itemId) {
        const node = await fetchHotelById(itemId, trip.currency).catch(() => null);
        if (node) setEnrichedNodes((prev) => sortNodes([...prev, node]));
      } else if (type === "HOTEL_DELETED" && itemId) {
        setEnrichedNodes((prev) => prev.filter((n) => n.id !== itemId));
      } else if (
        type === "ATTRACTION_ADDED" ||
        type === "ATTRACTION_UPDATED" ||
        type === "ATTRACTION_DELETED"
      ) {
        // Re-fetch all attractions and merge with non-attraction nodes
        const freshAttractions = await fetchAttractionsByTripId(trip.id, trip.currency).catch(() => [] as ItineraryNode[]);
        setEnrichedNodes((prev) => {
          const nonAttractions = prev.filter((n) => n.type !== "attraction");
          return sortNodes([...nonAttractions, ...freshAttractions]);
        });
      }
    },
    [trip.id, trip.currency]
  );

  const { activeUsers, activityLog } = useCollabSocket(trip.id, CURRENT_USER_ID, handleTripUpdate);

  const [resolvedCollaborators, setResolvedCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    if (!trip.member_ids?.length) return;
    fetchAllClients()
      .then((clients) => {
        const collaborators = trip.member_ids!
          .map((id) => {
            const client = clients.find((c) => c.client_uuid === id);
            return client
              ? {
                  id: client.client_uuid,
                  name: client.name,
                  initials: getInitials(client.name),
                  color: getColorFromUuid(client.client_uuid),
                  isOnline: false,
                }
              : null;
          })
          .filter((c): c is Collaborator => c !== null);
        setResolvedCollaborators(collaborators);
      })
      .catch(() => {});
  }, [trip.member_ids]);

  const collaboratorsWithStatus = useMemo(
    () => resolvedCollaborators.map((c) => ({ ...c, isOnline: activeUsers.includes(c.id) })),
    [resolvedCollaborators, activeUsers]
  );

  const handleDeleteNode = useCallback(
    async (node: ItineraryNode) => {
      try {
        if (node.type === "flight") {
          await deleteFlight(trip.id, CURRENT_USER_ID, node.id);
        } else if (node.type === "hotel") {
          await deleteHotel(trip.id, CURRENT_USER_ID, node.id);
        } else if (node.type === "attraction") {
          await deletePlannedAttraction(trip.id, CURRENT_USER_ID, node.id);
        }
        // Optimistic removal — collab socket will also fire for other users
        setEnrichedNodes((prev) => prev.filter((n) => n.id !== node.id));
        toast({ title: "Removed", description: `${node.title} removed from trip.` });
      } catch (err) {
        toast({
          title: "Failed to remove",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [trip.id]
  );

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
      const userTickets = await getUserBookedTickets(CURRENT_USER_ID);
      const bookedIds = new Set(userTickets.map((t) => t.f_h_a_id));

      const resolvedNodes = fetchedNodes.map((node) => {
        if (node.type === "attraction" && node.cost <= 0) {
          return { ...node, status: "added" as const };
        }
        return bookedIds.has(node.id) ? { ...node, status: "confirmed" as const } : node;
      });

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

  // Group nodes by date
  const nodesByDate = nodesToDisplay.reduce(
    (acc, node) => {
      if (!acc[node.date]) acc[node.date] = [];
      acc[node.date].push(node);
      return acc;
    },
    {} as Record<string, ItineraryNode[]>
  );

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
          <CollaboratorAvatars collaborators={collaboratorsWithStatus} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => navigate('/search?type=flights')}
          >
            <Plus className="w-3.5 h-3.5" />
            Search
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
              onClick={() => navigate('/search?type=flights')}
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
                  onClick={() => navigate('/search?type=flights')}
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
                    onClick={(n) => setSelectedNode(n)}
                    onDelete={node.status !== "confirmed" ? handleDeleteNode : undefined}
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
        <div className="flex-1 pane-border flex flex-col overflow-hidden">
          <DetailPane
            node={selectedNode}
            trip={trip}
            onClose={() => setSelectedNode(null)}
            onDelete={selectedNode?.status !== "confirmed" ? handleDeleteNode : undefined}
            onNodeBooked={(nodeId) =>
              setEnrichedNodes((prev) =>
                prev.map((n) => (n.id === nodeId ? { ...n, status: "confirmed" as const } : n))
              )
            }
            onNodeRemoved={(nodeId) => {
              setEnrichedNodes((prev) => prev.filter((n) => n.id !== nodeId));
              setSelectedNode(null);
            }}
            onNodeUpdated={(updated) =>
              setEnrichedNodes((prev) =>
                prev.map((n) => (n.id === updated.id ? updated : n))
              )
            }
          />
        </div>

        {/* Right: Ledger & Social */}
        <div className="w-80 shrink-0 bg-card overflow-y-auto">
          <LedgerPane trip={trip} activeUsers={activeUsers} activityLog={activityLog} />
        </div>
      </div>

    </div>
  );
}
