import { CollaboratorAvatars } from "./CollaboratorAvatars";
import { ActivityLog } from "./ActivityLog";
import type { Trip } from "@/types/trip";
import type { ActivityLogEntry } from "@/hooks/useCollabSocket";

interface LedgerPaneProps {
  trip: Trip;
  activeUsers?: string[];
  activityLog?: ActivityLogEntry[];
}

export function LedgerPane({ trip, activeUsers = [], activityLog = [] }: LedgerPaneProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Activity Log */}
      <div className="p-4 flex-1">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Activity
        </h3>
        <ActivityLog entries={activityLog} collaborators={trip.collaborators} />
      </div>
    </div>
  );
}
