import { Plane, Building2, MapPin, Car } from "lucide-react";

export type NodeType = "flight" | "hotel" | "attraction" | "transport";

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string;
  isOnline: boolean;
}

export interface ItineraryNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  time: string;
  date: string;
  duration?: string;
  cost: number;
  currency: string;
  status: "confirmed" | "pending" | "conflict" | "delayed" | "cancelled";
  details: Record<string, string>;
  conflictMessage?: string;
  delayMinutes?: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  currency: string;
  collaborators: Collaborator[];
  nodes: ItineraryNode[];
}

export const nodeIcons: Record<NodeType, typeof Plane> = {
  flight: Plane,
  hotel: Building2,
  attraction: MapPin,
  transport: Car,
};

export const nodeColors: Record<NodeType, string> = {
  flight: "border-l-node-flight",
  hotel: "border-l-node-hotel",
  attraction: "border-l-node-attraction",
  transport: "border-l-node-transport",
};

export const nodeColorsDot: Record<NodeType, string> = {
  flight: "bg-node-flight",
  hotel: "bg-node-hotel",
  attraction: "bg-node-attraction",
  transport: "bg-node-transport",
};
