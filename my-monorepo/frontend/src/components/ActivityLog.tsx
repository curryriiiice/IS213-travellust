import type { ActivityLogEntry } from "@/hooks/useCollabSocket";
import type { Collaborator } from "@/types/trip";

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
  const nameById = new Map(collaborators.map((c) => [c.id, c.name]));

  if (entries.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground font-mono px-1 py-2">
        No activity yet
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {entries.map((entry) => {
        const icon = EVENT_ICONS[entry.eventType] ?? "·";
        const name = entry.userId
          ? (nameById.get(entry.userId) ?? entry.userId.slice(0, 8))
          : null;

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
