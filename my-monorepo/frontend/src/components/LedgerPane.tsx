import { CollaboratorAvatars } from "./CollaboratorAvatars";
import type { Trip } from "@/types/trip";

interface LedgerPaneProps {
  trip: Trip;
}

export function LedgerPane({ trip }: LedgerPaneProps) {
  const costByType = trip.nodes.reduce(
    (acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + node.cost;
      return acc;
    },
    {} as Record<string, number>
  );

  const typeLabels: Record<string, string> = {
    flight: "Flights",
    hotel: "Hotels",
    attraction: "Attractions",
    transport: "Transport",
  };

  const typeColors: Record<string, string> = {
    flight: "bg-node-flight",
    hotel: "bg-node-hotel",
    attraction: "bg-node-attraction",
    transport: "bg-node-transport",
  };

  const totalCost = trip.nodes.reduce((sum, n) => sum + n.cost, 0);
  const perPerson = totalCost / Math.max(trip.collaborators.length, 1);

  return (
    <div className="h-full flex flex-col">
      {/* Collaborators */}
      <div className="p-4 border-b border-border">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Collaborators
        </h3>
        <div className="space-y-2">
          {trip.collaborators.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ backgroundColor: c.color }}
              >
                {c.initials}
              </div>
              <span className="text-xs">{c.name}</span>
              {c.isOnline && (
                <span className="text-[10px] text-node-hotel ml-auto">online</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-4 border-b border-border flex-1">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Cost Breakdown
        </h3>
        <div className="space-y-2">
          {Object.entries(costByType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, cost]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${typeColors[type]}`} />
                  <span className="text-xs">{typeLabels[type] || type}</span>
                </div>
                <span className="text-xs font-mono tabular-nums">${cost.toLocaleString()}</span>
              </div>
            ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Total</span>
            <span className="text-sm font-mono tabular-nums font-medium">
              ${totalCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Split */}
      <div className="p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Even Split
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {trip.collaborators.length} travelers
          </span>
          <span className="text-sm font-mono tabular-nums font-medium">
            ${perPerson.toFixed(0)} / person
          </span>
        </div>
      </div>
    </div>
  );
}
