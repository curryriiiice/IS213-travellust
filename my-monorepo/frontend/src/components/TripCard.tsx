import { motion } from "framer-motion";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import type { Trip } from "@/types/trip";
import { MapPin, Calendar, ArrowRight } from "lucide-react";

interface TripCardProps {
  trip: Trip;
  onClick: (trip: Trip) => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const pct = trip.budget > 0 ? Math.min((trip.spent / trip.budget) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick(trip)}
      className="bg-card border border-border rounded-sm p-4 cursor-pointer node-interactive surface-elevated group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium tracking-tight">{trip.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{trip.destination}</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-3">
        <Calendar className="w-3 h-3" />
        {trip.startDate} → {trip.endDate}
      </div>

      {/* Budget mini-bar */}
      <div className="mb-3">
        <div className="h-1 bg-secondary rounded-sm overflow-hidden">
          <div className="h-full budget-gradient rounded-sm" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            ${trip.spent.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            ${trip.budget.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <CollaboratorAvatars collaborators={trip.collaborators} />
        <span className="text-[10px] font-mono text-muted-foreground">
          {trip.nodes.length} nodes
        </span>
      </div>
    </motion.div>
  );
}
