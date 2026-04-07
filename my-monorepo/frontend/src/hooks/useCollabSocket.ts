import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface ActivityLogEntry {
  id: string;
  eventType: string;
  userId: string;
  timestamp: string;
  description: string;
}

interface CollabEvent {
  type: string;
  trip_id: string;
  data: Record<string, unknown>;
  user_id: string;
  timestamp: string;
}

const COLLAB_URL = "http://localhost:5010";

interface HistoryEntry {
  id: number;          // BIGSERIAL — Supabase returns this as a number
  event_type: string;
  user_id: string;
  description: string;
  created_at: string;
}

async function fetchActivityHistory(tripId: string): Promise<ActivityLogEntry[]> {
  try {
    const res = await fetch(`/api/collab/trip/${tripId}/activity`);
    if (!res.ok) return [];
    const json = await res.json();
    const rows: HistoryEntry[] = json.data ?? [];
    return rows.map((row) => ({
      id: String(row.id),   // convert bigserial number to string for ActivityLogEntry
      eventType: row.event_type,
      userId: row.user_id ?? "",
      timestamp: row.created_at,
      description: row.description,
    }));
  } catch {
    return [];
  }
}

function buildDescription(eventType: string, payload: Record<string, unknown>): string {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const arr = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

  if (eventType === "FLIGHT_ADDED") {
    const name = `${str(payload.airline)} ${str(payload.flight_number)}`.trim() || "Flight";
    return `${name} added`;
  }
  if (eventType === "FLIGHT_UPDATED") {
    const name = `${str(payload.airline)} ${str(payload.flight_number)}`.trim() || "Flight";
    return `${name} updated`;
  }
  if (eventType === "FLIGHT_DELETED") {
    const deleted = obj(payload.deleted_flight);
    const name = `${str(deleted.airline)} ${str(deleted.flight_number)}`.trim() || "Flight";
    return `${name} removed`;
  }
  if (eventType === "HOTEL_ADDED") {
    return `${str(payload.name) || "Hotel"} added`;
  }
  if (eventType === "HOTEL_DELETED") {
    const hotels = arr(payload.deleted_hotels);
    const name = hotels.length > 0 ? str(hotels[0].name) || "Hotel" : "Hotel";
    return `${name} removed`;
  }
  if (eventType === "ATTRACTION_ADDED") {
    return `${str(payload.name) || "Attraction"} added`;
  }
  if (eventType === "ATTRACTION_UPDATED") {
    return `${str(payload.name) || "Attraction"} updated`;
  }
  if (eventType === "ATTRACTION_DELETED") {
    const deleted = obj(payload.deleted_attraction);
    return `${str(deleted.name) || "Attraction"} removed`;
  }
  return eventType;
}

export function useCollabSocket(
  tripId: string,
  userId: string,
  onTripUpdate: (event: CollabEvent) => void
) {
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const onTripUpdateRef = useRef(onTripUpdate);

  // Keep callback ref current without re-connecting on every render
  useEffect(() => {
    onTripUpdateRef.current = onTripUpdate;
  }, [onTripUpdate]);

  const appendLog = useCallback((entry: ActivityLogEntry) => {
    setActivityLog((prev) => [entry, ...prev]);
  }, []);

  useEffect(() => {
    if (!tripId || !userId) return;

    const socket = io(COLLAB_URL, {
      query: { trip_id: tripId, user_id: userId },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connected", (data: { active_users: string[] }) => {
      setActiveUsers(data.active_users ?? []);
    });

    socket.on("user_joined", (data: { user_id: string; active_users: string[] }) => {
      setActiveUsers(data.active_users ?? []);
      appendLog({
        id: String(Date.now()),
        eventType: "user_joined",
        userId: data.user_id,
        timestamp: new Date().toISOString(),
        description: "Joined the trip",
      });
    });

    socket.on("user_left", (data: { user_id: string; active_users: string[] }) => {
      setActiveUsers(data.active_users ?? []);
      appendLog({
        id: String(Date.now()),
        eventType: "user_left",
        userId: data.user_id,
        timestamp: new Date().toISOString(),
        description: "Left the trip",
      });
    });

    socket.on("trip_update", (event: CollabEvent) => {
      const description = buildDescription(event.type, event.data ?? {});
      appendLog({
        id: String(Date.now()),
        eventType: event.type,
        userId: event.user_id ?? "",
        timestamp: event.timestamp ?? new Date().toISOString(),
        description,
      });
      onTripUpdateRef.current(event);
    });

    socket.on("error", (err: { message: string }) => {
      console.error("[CollabSocket] error:", err.message);
    });

    socket.on("connect_error", (err) => {
      console.error("[CollabSocket] connect error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId, userId, appendLog]);

  // Fetch persisted history on mount; append below any already-received live events
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    fetchActivityHistory(tripId).then((history) => {
      if (cancelled) return;
      setActivityLog((live) => {
        const liveTimestamps = new Set(live.map((e) => e.timestamp));
        const newHistory = history.filter((h) => !liveTimestamps.has(h.timestamp));
        return [...live, ...newHistory];
      });
    });

    return () => { cancelled = true; };
  }, [tripId]);

  return { activeUsers, activityLog };
}
