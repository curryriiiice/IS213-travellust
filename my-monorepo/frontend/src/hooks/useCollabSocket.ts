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

const EVENT_DESCRIPTIONS: Record<string, string> = {
  FLIGHT_ADDED: "Flight added to itinerary",
  FLIGHT_UPDATED: "Flight updated",
  FLIGHT_DELETED: "Flight removed",
  HOTEL_ADDED: "Hotel added",
  HOTEL_DELETED: "Hotel removed",
  ATTRACTION_ADDED: "Attraction added",
  ATTRACTION_UPDATED: "Attraction updated",
  ATTRACTION_DELETED: "Attraction removed",
};

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
      const description = EVENT_DESCRIPTIONS[event.type] ?? event.type;
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

  return { activeUsers, activityLog };
}
