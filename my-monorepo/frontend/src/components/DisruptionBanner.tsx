import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ItineraryNode } from "@/types/trip";

interface DisruptionBannerProps {
  node: ItineraryNode;
  onAccept?: () => void;
  onIgnore?: () => void;
}

export function DisruptionBanner({ node, onAccept, onIgnore }: DisruptionBannerProps) {
  if (!node.conflictMessage) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-destructive/10 border border-destructive/20 rounded-sm p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-destructive">
          Disruption Detected
        </span>
        {node.delayMinutes && (
          <Badge variant="outline" className="text-destructive border-destructive/30">
            +{node.delayMinutes}m
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {node.conflictMessage}
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="accent" onClick={onAccept}>
          Accept Adjustment
        </Button>
        <Button size="sm" variant="ghost" onClick={onIgnore}>
          Ignore
        </Button>
      </div>
    </motion.div>
  );
}
