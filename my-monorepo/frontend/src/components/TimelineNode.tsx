import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { nodeColors, nodeColorsDot, nodeIcons, type ItineraryNode } from "@/types/trip";
import { AlertTriangle, Clock } from "lucide-react";

interface TimelineNodeProps {
  node: ItineraryNode;
  isSelected: boolean;
  onClick: (node: ItineraryNode) => void;
  isFirst?: boolean;
}

export function TimelineNode({ node, isSelected, onClick, isFirst }: TimelineNodeProps) {
  const Icon = nodeIcons[node.type];
  const borderColor = nodeColors[node.type];
  const dotColor = nodeColorsDot[node.type];
  const hasConflict = node.status === "conflict" || node.status === "delayed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{
        opacity: 1,
        x: 0,
        ...(hasConflict && node.status === "delayed"
          ? { x: [-1, 1, -1, 0] }
          : {}),
      }}
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onClick(node)}
      className={`
        relative border-l-2 ${borderColor} pl-4 pr-3 py-3 node-interactive
        ${isSelected ? "bg-secondary" : ""}
        ${hasConflict ? "animate-shiver" : ""}
      `}
    >
      {/* Timeline dot */}
      <div className={`absolute -left-[5px] top-4 w-2 h-2 rounded-full ${dotColor}`} />

      {/* Date header for first or new date */}
      {isFirst && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          {node.date}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate tracking-tight">{node.title}</div>
            <div className="text-xs text-muted-foreground truncate">{node.subtitle}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-mono tabular-nums">{node.time}</span>
          {node.duration && (
            <span className="text-[10px] text-muted-foreground font-mono">{node.duration}</span>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1.5 mt-2">
        {node.status === "confirmed" && (
          <Badge variant="outline" className="text-node-hotel border-node-hotel/30">
            Confirmed
          </Badge>
        )}
        {node.status === "pending" && (
          <Badge variant="outline" className="text-node-attraction border-node-attraction/30">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            Pending
          </Badge>
        )}
        {node.status === "delayed" && (
          <Badge variant="outline" className="text-destructive border-destructive/30">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            +{node.delayMinutes}m
          </Badge>
        )}
        {node.status === "conflict" && (
          <Badge variant="outline" className="text-destructive border-destructive/30">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            Conflict
          </Badge>
        )}
        {node.cost > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums ml-auto">
            ${node.cost.toLocaleString()}
          </span>
        )}
      </div>
    </motion.div>
  );
}
