import type { ItineraryNode } from "@/types/trip";
import { nodeIcons } from "@/types/trip";
import { DisruptionBanner } from "./DisruptionBanner";

interface DetailPaneProps {
  node: ItineraryNode | null;
}

export function DetailPane({ node }: DetailPaneProps) {
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

  const Icon = nodeIcons[node.type];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium tracking-tight">{node.title}</h2>
            <p className="text-sm text-muted-foreground">{node.subtitle}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-mono text-muted-foreground">{node.date}</span>
              <span className="text-xs font-mono text-muted-foreground">{node.time}</span>
              {node.duration && (
                <span className="text-xs font-mono text-muted-foreground">{node.duration}</span>
              )}
            </div>
          </div>
        </div>

        {/* Disruption banner */}
        {(node.status === "conflict" || node.status === "delayed") && (
          <div className="mb-6">
            <DisruptionBanner node={node} />
          </div>
        )}

        {/* Details grid */}
        <div className="space-y-1">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Details
          </h3>
          {Object.entries(node.details).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground capitalize">{key}</span>
              <span className="text-xs font-mono">{value}</span>
            </div>
          ))}
        </div>

        {/* Cost */}
        {node.cost > 0 && (
          <div className="mt-6 p-3 bg-secondary rounded-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Cost
              </span>
              <span className="text-base font-mono tabular-nums font-medium">
                ${node.cost.toLocaleString()} {node.currency}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
