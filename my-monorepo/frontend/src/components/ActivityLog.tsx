import { formatDistanceToNow, parseISO } from "date-fns";
import { Plane, Building2, MapPin, Train, Package, Clock } from "lucide-react";
import type { ActivityEntry } from "@/hooks/useCollaborationSocket";

const NODE_ICON: Record<string, React.ElementType> = {
  flight: Plane,
  hotel: Building2,
  attraction: MapPin,
  transport: Train,
  node: Package,
  trip: Package,
};

const NODE_COLOR: Record<string, string> = {
  flight: "text-blue-400",
  hotel: "text-emerald-400",
  attraction: "text-amber-400",
  transport: "text-purple-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(ts: string) {
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

function absoluteTime(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

interface ActivityLogProps {
  entries: ActivityEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center px-4">
        <Clock className="w-5 h-5 text-muted-foreground mb-2" />
        <p className="text-[10px] text-muted-foreground font-mono">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {entries.map((entry) => {
        const Icon = NODE_ICON[entry.node_type] ?? Package;
        const iconColor = NODE_COLOR[entry.node_type] ?? "text-muted-foreground";

        return (
          <div key={entry.id} className="flex gap-2.5 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
            {/* User avatar dot */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 text-background"
              style={{ backgroundColor: stringToColor(entry.user_name) }}
              title={entry.user_name}
            >
              {initials(entry.user_name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-medium truncate">{entry.user_name}</span>
                <span className="text-[10px] text-muted-foreground">{entry.verb}</span>
                {entry.item_name && (
                  <span className="flex items-center gap-0.5">
                    <Icon className={`w-2.5 h-2.5 shrink-0 ${iconColor}`} />
                    <span className="text-[10px] font-mono truncate max-w-[100px]">{entry.item_name}</span>
                  </span>
                )}
              </div>
              <span
                className="text-[9px] text-muted-foreground font-mono"
                title={absoluteTime(entry.timestamp)}
              >
                {relativeTime(entry.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Deterministic HSL color from a string — keeps avatar colors consistent. */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}
