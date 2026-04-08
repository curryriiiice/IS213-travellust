import { useEffect, useState } from "react";
import { nodeIcons, type ItineraryNode } from "@/types/trip";
import type { Trip } from "@/types/trip";
import { DisruptionBanner } from "./DisruptionBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Clock, Shield, Check, Loader2, Users, Trash2 } from "lucide-react";
import { bookAttraction, bookFlight, bookHotel, cancelAttractionBooking } from "@/api/booking";
import { updatePlannedAttraction } from "@/api/plan";
import { getCurrentUserId, getUser } from "@/lib/auth";
import { fetchAllClients, type ExternalClient } from "@/api/collaborator";

const MAIN_USER_ID = getCurrentUserId();

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function durationMinutesFromNode(node: ItineraryNode): number {
  const fromDetails = Number(node.details.duration_minutes ?? "");
  return !Number.isNaN(fromDetails) && fromDetails > 0 ? fromDetails : 120;
}

interface DetailPaneProps {
  node: ItineraryNode | null;
  trip: Trip;
  onNodeBooked?: (nodeId: string) => void;
  onNodeRemoved?: (nodeId: string) => void;
  onNodeUpdated?: (node: ItineraryNode) => void;
  onDelete?: (node: ItineraryNode) => void;
}

export function DetailPane({ node, trip, onNodeBooked, onNodeRemoved, onNodeUpdated, onDelete }: DetailPaneProps) {
  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a node to view details</p>
          <p className="text-xs mt-1">Click any item in the timeline</p>
        </div>
      </div>
    );
  }

  return (
    <NodeDetailInline
      node={node}
      trip={trip}
      onNodeBooked={onNodeBooked}
      onNodeRemoved={onNodeRemoved}
      onNodeUpdated={onNodeUpdated}
      onDelete={onDelete}
    />
  );
}

function NodeDetailInline({
  node,
  trip,
  onNodeBooked,
  onNodeRemoved,
  onNodeUpdated,
  onDelete,
}: {
  node: ItineraryNode;
  trip: Trip;
  onNodeBooked?: (nodeId: string) => void;
  onNodeRemoved?: (nodeId: string) => void;
  onNodeUpdated?: (node: ItineraryNode) => void;
  onDelete?: (node: ItineraryNode) => void;
}) {
  const Icon = nodeIcons[node.type];
  const tripId = trip.id;
  const memberIds = trip.member_ids ?? [];

  // Flags
  const isFlightNode = node.type === "flight";
  const isHotelNode = node.type === "hotel";
  const isAttractionNode = node.type === "attraction";
  const isConfirmed = node.status === "confirmed";
  const isFreeAttraction = isAttractionNode && node.cost <= 0;
  const isCatalogAttraction = isAttractionNode && node.sourceType === "catalog";
  const isManualAttraction = isAttractionNode && node.sourceType === "manual";

  const showBookFlightHotel = (isFlightNode || isHotelNode) && !isConfirmed;
  const showEditButton = isAttractionNode;
  const showAttractionBookButton = isAttractionNode && isCatalogAttraction && !isFreeAttraction && !isConfirmed;
  const showAttractionCancelButton = isAttractionNode && isCatalogAttraction && !isFreeAttraction && isConfirmed;
  const showManualConfirmButton = isAttractionNode && isManualAttraction && !isFreeAttraction && !isConfirmed;
  const showDeleteButton = !!onDelete && !isConfirmed;
  const hasFooter = showBookFlightHotel || showEditButton || showAttractionBookButton || showAttractionCancelButton || showManualConfirmButton || showDeleteButton;

  // Booking state
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isBookingAttraction, setIsBookingAttraction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<ExternalClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Fetch clients when passenger modal opens
  useEffect(() => {
    if (isPassengerModalOpen && clients.length === 0) {
      setIsLoadingClients(true);
      fetchAllClients()
        .then((fetchedClients) => {
          setClients(fetchedClients);
        })
        .catch((error) => {
          console.error("Failed to fetch clients:", error);
        })
        .finally(() => {
          setIsLoadingClients(false);
        });
    }
  }, [isPassengerModalOpen, clients.length]);

  // Helper to get user name from ID
  const getUserName = (userId: string): string => {
    const client = clients.find((c) => c.client_uuid === userId);
    if (client) return client.name;

    // Fallback to current user from localStorage
    const currentUser = getUser();
    if (currentUser && currentUser.id === userId) return currentUser.name;

    return userId;
  };

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(node.title);
  const [editLocation, setEditLocation] = useState(node.subtitle);
  const [editMapsLink, setEditMapsLink] = useState(node.mapsLink ?? (node.details.gmaps_link as string) ?? "");
  const [editDate, setEditDate] = useState(node.date);
  const [editTime, setEditTime] = useState(node.time);
  const [editDuration, setEditDuration] = useState(String(durationMinutesFromNode(node)));
  const [editEndTime, setEditEndTime] = useState(addMinutesToTime(node.time, durationMinutesFromNode(node)));
  const [editCost, setEditCost] = useState(String(node.cost ?? 0));

  useEffect(() => {
    setEditName(node.title);
    setEditLocation(node.subtitle);
    setEditMapsLink(node.mapsLink ?? (node.details.gmaps_link as string) ?? "");
    setEditDate(node.date);
    setEditTime(node.time);
    const dur = durationMinutesFromNode(node);
    setEditDuration(String(dur));
    setEditEndTime(addMinutesToTime(node.time, dur));
    setEditCost(String(node.cost ?? 0));
  }, [node]);

  useEffect(() => {
    const dur = Number(editDuration);
    if (!Number.isNaN(dur) && dur >= 0) setEditEndTime(addMinutesToTime(editTime, dur));
  }, [editTime, editDuration]);

  const handleEditEndTime = (next: string) => {
    setEditEndTime(next);
    const [sh, sm] = editTime.split(":").map(Number);
    const [eh, em] = next.split(":").map(Number);
    if ([sh, sm, eh, em].some(Number.isNaN)) return;
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 1440;
    setEditDuration(String(mins));
  };

  // --- Flight/Hotel booking ---
  const handleOpenPassengerModal = () => {
    const initial = memberIds.includes(MAIN_USER_ID) ? [MAIN_USER_ID] : [];
    setSelectedUserIds(initial);
    setIsPassengerModalOpen(true);
  };

  const togglePassenger = (uid: string) =>
    setSelectedUserIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

  const handleConfirmBooking = async () => {
    if (selectedUserIds.length === 0) {
      toast({ title: "No Guests Selected", description: "Please select at least one guest.", variant: "destructive" });
      return;
    }
    setIsBooking(true);
    try {
      if (isFlightNode) {
        await bookFlight(tripId, MAIN_USER_ID, selectedUserIds, node.id);
        toast({ title: "✈️ Flight Booking Successful", description: `Booked for ${selectedUserIds.length} passenger${selectedUserIds.length > 1 ? "s" : ""}.` });
      } else if (isHotelNode) {
        await bookHotel(tripId, MAIN_USER_ID, selectedUserIds, node.id);
        toast({ title: "🏨 Hotel Booking Successful", description: `Booked for ${selectedUserIds.length} guest${selectedUserIds.length > 1 ? "s" : ""}.` });
      } else if (isAttractionNode) {
        await bookAttraction(tripId, MAIN_USER_ID, selectedUserIds, node.id);
        toast({ title: "🎪 Attraction Booking Successful", description: `Booked for ${selectedUserIds.length} guest${selectedUserIds.length > 1 ? "s" : ""}.` });
      }
      setIsPassengerModalOpen(false);
      onNodeBooked?.(node.id);
    } catch (err) {
      toast({ title: "Booking Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsBooking(false);
    }
  };

  // --- Attraction booking ---
  const handleCancelAttraction = async () => {
    setIsBookingAttraction(true);
    try {
      await cancelAttractionBooking(tripId, MAIN_USER_ID, node.id);
      toast({ title: "Booking cancelled", description: `${node.title} is back to pending.` });
      onNodeBooked?.(node.id); // re-use to trigger a refresh; caller can re-fetch
    } catch (err) {
      toast({ title: "Cancel failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsBookingAttraction(false);
    }
  };

  const handleConfirmManual = async () => {
    setIsSaving(true);
    try {
      await updatePlannedAttraction(tripId, MAIN_USER_ID, node.id, {
        name: node.title,
        location: node.subtitle,
        gmapsLink: node.mapsLink ?? (node.details.gmaps_link as string) ?? "",
        visitDate: node.date,
        visitTime: node.time,
        durationMinutes: durationMinutesFromNode(node),
        cost: node.cost,
        status: "confirmed",
      });
      toast({ title: "Attraction confirmed", description: `${node.title} is now confirmed.` });
      onNodeBooked?.(node.id);
    } catch (err) {
      toast({ title: "Confirm failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Edit attraction ---
  const handleSaveAttraction = async () => {
    setIsSaving(true);
    try {
      await updatePlannedAttraction(tripId, MAIN_USER_ID, node.id, {
        name: editName,
        location: editLocation,
        gmapsLink: editMapsLink,
        visitDate: editDate,
        visitTime: editTime,
        durationMinutes: Number(editDuration) || 120,
        cost: Number(editCost) || 0,
      });
      toast({ title: "Attraction updated", description: `${editName} was updated.` });
      setIsEditOpen(false);
      onNodeUpdated?.({ ...node, title: editName, subtitle: editLocation, date: editDate, time: editTime, cost: Number(editCost) || 0 });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldLabelMap: Record<string, string> = {
    flight_number: "Flight Number",
    aircraft_type: "Aircraft",
    co2_kg: "CO2 Consumption (kg)",
    datetime_departure: "Departure",
    datetime_arrival: "Arrival",
    external_link: "More Information",
  };
  const excludedFields = ["price_sgd", "price_usd", "arrival_time"];

  const displayStatus = isAttractionNode && isFreeAttraction
    ? "Added"
    : isAttractionNode && isConfirmed
    ? isCatalogAttraction ? "Booked" : "Confirmed"
    : isAttractionNode
    ? "Pending"
    : node.status.charAt(0).toUpperCase() + node.status.slice(1);

  const typeColor = { flight: "text-accent", hotel: "text-node-hotel", attraction: "text-node-attraction", transport: "text-muted-foreground" }[node.type];
  const typeLabel = { flight: "Flight", hotel: "Hotel", attraction: "Attraction", transport: "Transport" }[node.type];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${typeColor}`} />
          <span className={`text-[10px] font-mono uppercase tracking-widest ${typeColor}`}>{typeLabel}</span>
        </div>
        <h2 className="text-lg font-medium tracking-tight">{node.title}</h2>
        {node.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{node.subtitle}</p>}

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 py-4 border-t border-border">
          <InfoBlock icon={Clock} label="Date" value={new Date(node.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
          <InfoBlock icon={Clock} label="Time" value={node.time} />
          {isAttractionNode && (
            <InfoBlock icon={Clock} label="End Time" value={addMinutesToTime(node.time, durationMinutesFromNode(node))} />
          )}
          {node.duration && <InfoBlock icon={Clock} label="Duration" value={node.duration} />}
          <InfoBlock icon={Shield} label="Status" value={displayStatus} success={isConfirmed} warn={node.status === "conflict" || node.status === "cancelled"} />
        </div>

        {/* Disruption banner */}
        {(node.status === "conflict" || node.status === "delayed") && (
          <div className="mb-4">
            <DisruptionBanner node={node} />
          </div>
        )}

        {/* Details */}
        {Object.keys(node.details).length > 0 && (
          <div className="mt-4 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</span>
            {Object.entries(node.details)
              .filter(([key, value]) => {
                if (excludedFields.includes(key)) return false;
                if (key === "catalog_attraction_id") return false;
                if (key === "gmaps_link" && !String(value ?? "").trim()) return false;
                if (!String(value ?? "").trim()) return false;
                return true;
              })
              .map(([key, val]) => (
                <div key={key} className="text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground block text-xs">
                    {key === "location" && isManualAttraction ? "Subtitle" : fieldLabelMap[key] || key}
                  </span>
                  <span className={`font-mono break-all text-xs ${key === "external_link" ? "text-accent" : ""}`}>
                    {key === "external_link" ? (
                      <a href={val as string} target="_blank" rel="noopener noreferrer">{val as string}</a>
                    ) : key === "gmaps_link" ? (
                      <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                        Open in Google Maps
                      </a>
                    ) : key === "visit_time" ? (
                      <span>{node.time}</span>
                    ) : key === "duration_minutes" ? (
                      <span>{node.duration || `${val}m`}</span>
                    ) : (
                      val as string
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {hasFooter && (
        <div className="px-6 py-4 border-t border-border bg-secondary/30 shrink-0 flex items-center justify-between">
          <div>
            {node.cost > 0 && (
              <>
                <span className="text-xl font-mono tabular-nums font-medium">${node.cost.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ml-1.5">{node.currency}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showDeleteButton && (
              <Button variant="outline" size="sm" onClick={() => onDelete!(node)} className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
            {showEditButton && (
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} disabled={isSaving}>
                Edit
              </Button>
            )}
            {showManualConfirmButton && (
              <Button variant="accent" size="sm" onClick={handleConfirmManual} disabled={isSaving}>
                {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Confirming…</> : "Confirm"}
              </Button>
            )}
            {showAttractionCancelButton && (
              <Button variant="outline" size="sm" onClick={handleCancelAttraction} disabled={isBookingAttraction}>
                {isBookingAttraction ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Cancelling…</> : "Cancel Booking"}
              </Button>
            )}
            {showAttractionBookButton && (
              <Button variant="accent" size="sm" onClick={handleOpenPassengerModal}>
                <Check className="w-3.5 h-3.5 mr-1" /> Book Attraction
              </Button>
            )}
            {showBookFlightHotel && (
              <Button variant="accent" size="sm" onClick={handleOpenPassengerModal}>
                <Check className="w-3.5 h-3.5 mr-1" /> Book {typeLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Edit Attraction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Edit Attraction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">{isManualAttraction ? "Subtitle" : "Location"}</label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Date</label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Time</label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">End Time</label>
                <Input type="time" value={editEndTime} onChange={(e) => handleEditEndTime(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Duration (min)</label>
                <Input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Cost</label>
              <Input type="number" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Google Maps Link</label>
              <Input value={editMapsLink} onChange={(e) => setEditMapsLink(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={handleSaveAttraction} disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passenger Selection Modal */}
      <Dialog open={isPassengerModalOpen} onOpenChange={setIsPassengerModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-accent" />
              Select Guests for {typeLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Choose which trip members to book for this {typeLabel.toLowerCase()}.</p>
            {memberIds.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No member IDs found for this trip.</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {isLoadingClients ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 text-muted-foreground/40 mx-auto animate-spin" />
                    <p className="text-xs text-muted-foreground mt-2">Loading users...</p>
                  </div>
                ) : (
                  memberIds.map((uid) => {
                    const isSelected = selectedUserIds.includes(uid);
                    const userName = getUserName(uid);
                    return (
                      <button
                        key={uid}
                        onClick={() => togglePassenger(uid)}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-sm transition-all border ${
                          isSelected ? "bg-accent/10 border-accent/40 text-foreground" : "border-transparent hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-accent border-accent" : "border-border"}`}>
                          {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{userName}</p>
                          {uid === MAIN_USER_ID && <p className="text-[10px] text-accent font-mono">you</p>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-mono text-muted-foreground">{selectedUserIds.length} guest{selectedUserIds.length !== 1 ? "s" : ""} selected</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setIsPassengerModalOpen(false)} disabled={isBooking}>Cancel</Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleConfirmBooking}
              disabled={isBooking || (memberIds.length > 0 && selectedUserIds.length === 0)}
            >
              {isBooking ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Booking…</> : <><Check className="w-3.5 h-3.5 mr-1.5" /> Confirm Booking</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, warn, success }: { icon: React.ElementType; label: string; value: string; warn?: boolean; success?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-mono ${warn ? "text-destructive" : success ? "text-node-hotel" : ""}`}>{value}</p>
    </div>
  );
}
