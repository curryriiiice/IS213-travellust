import { useEffect, useState } from "react";
import type { ActivityLogEntry } from "@/hooks/useCollabSocket";
import type { Collaborator } from "@/types/trip";
import { fetchAllClients, type ExternalClient } from "@/api/collaborator";
import { getUser } from "@/lib/auth";

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  collaborators: Collaborator[];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const EVENT_ICONS: Record<string, string> = {
  FLIGHT_ADDED: "✈",
  FLIGHT_UPDATED: "✈",
  FLIGHT_DELETED: "✈",
  HOTEL_ADDED: "🏨",
  HOTEL_DELETED: "🏨",
  ATTRACTION_ADDED: "📍",
  ATTRACTION_UPDATED: "📍",
  ATTRACTION_DELETED: "📍",
  user_joined: "👤",
  user_left: "👤",
};

export function ActivityLog({ entries, collaborators }: ActivityLogProps) {
  const [clients, setClients] = useState<ExternalClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllClients()
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch clients:", error);
        setLoading(false);
      });
  }, []);

  // Helper to get user name from ID
  const getUserName = (userId: string): string => {
    // First check collaborators (trip-specific)
    const collaborator = collaborators.find((c) => c.id === userId);
    if (collaborator) return collaborator.name;

    // Then check external clients
    const client = clients.find((c) => c.client_uuid === userId);
    if (client) return client.name;

    // Fallback to current user from localStorage
    const currentUser = getUser();
    if (currentUser && currentUser.id === userId) return currentUser.name;

    // Last resort: show truncated ID
    return userId.slice(0, 8);
  };

  if (entries.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground font-mono px-1 py-2">
        No activity yet
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-[10px] text-muted-foreground font-mono px-1 py-2">
        Loading activity...
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {entries.map((entry) => {
        const icon = EVENT_ICONS[entry.eventType] ?? "·";
        const name = entry.userId ? getUserName(entry.userId) : null;

        return (
          <div key={entry.id} className="flex items-start gap-2">
            <span className="text-sm leading-none mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-xs leading-snug">{entry.description}</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {name && <span className="mr-1">{name}</span>}
                <span>· {formatTimestamp(entry.timestamp)}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
