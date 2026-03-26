import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ItineraryNode } from "@/types/trip";

const COLLAB_URL = import.meta.env.VITE_COLLAB_URL ?? "http://localhost:5010";
const MAX_LOG_ENTRIES = 50;

export interface ActivityEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  event: string;
  verb: string;
  node_type: string;
  item_name: string;
  timestamp: string;
}

export type TripUpdateEvent =
  | { type: "FLIGHT_ADDED" | "HOTEL_ADDED" | "ATTRACTION_ADDED" | "NODE_ADDED"; data: Partial<ItineraryNode> }
  | { type: "FLIGHT_UPDATED" | "HOTEL_UPDATED" | "ATTRACTION_UPDATED" | "NODE_UPDATED"; data: Partial<ItineraryNode> & { flight_id?: string } }
  | { type: "FLIGHT_DELETED" | "HOTEL_DELETED" | "ATTRACTION_DELETED" | "NODE_DELETED"; data: { flight_id?: string; hotel_id?: string; node_id?: string } }
  | { type: string; data: Record<string, unknown> };

interface UseCollaborationSocketOptions {
  onTripUpdate?: (event: TripUpdateEvent & { user_id: string | null }) => void;
}

interface UseCollaborationSocketResult {
  activeUserIds: string[];
  activityLog: ActivityEntry[];
  isConnected: boolean;
}

export function useCollaborationSocket(
  tripId: string | null,
  userId: string,
  options: UseCollaborationSocketOptions = {}
): UseCollaborationSocketResult {
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const onTripUpdateRef = useRef(options.onTripUpdate);
  onTripUpdateRef.current = options.onTripUpdate;

  const appendActivity = useCallback((entry: Omit<ActivityEntry, "id">) => {
    setActivityLog((prev) => {
      const next = [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...prev];
      return next.slice(0, MAX_LOG_ENTRIES);
    });
  }, []);

  useEffect(() => {
    if (!tripId) return;

    const socket = io(COLLAB_URL, {
      query: { trip_id: tripId, user_id: userId },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("connected", (payload: { active_users: string[] }) => {
      setActiveUserIds(payload.active_users ?? []);
    });

    socket.on("user_joined", (payload: { user_id: string; active_users: string[] }) => {
      setActiveUserIds(payload.active_users ?? []);
    });

    socket.on("user_left", (payload: { user_id: string; active_users: string[] }) => {
      setActiveUserIds(payload.active_users ?? []);
    });

    socket.on("trip_update", (payload: TripUpdateEvent & { user_id: string | null }) => {
      onTripUpdateRef.current?.(payload);
    });

    socket.on("activity_log", (entry: Omit<ActivityEntry, "id">) => {
      appendActivity(entry);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [tripId, userId, appendActivity]);

  return { activeUserIds, activityLog, isConnected };
}
