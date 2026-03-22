import type { Collaborator } from "@/types/trip";

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  size?: "sm" | "md";
}

export function CollaboratorAvatars({ collaborators, size = "sm" }: CollaboratorAvatarsProps) {
  const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <div className="flex -space-x-1.5">
      {collaborators.map((c) => (
        <div
          key={c.id}
          className={`${dim} rounded-full flex items-center justify-center font-medium border-2 border-background relative`}
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.initials}
          {c.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-node-hotel border border-background" />
          )}
        </div>
      ))}
    </div>
  );
}
