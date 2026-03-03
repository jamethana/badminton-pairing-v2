import { cn } from "@/lib/utils";
import SkillBar, { getSkillColor } from "./skill-bar";

interface PlayerBadgeProps {
  name: string;
  skillLevel: number;
  matchesPlayed?: number;
  gamesSinceLastPlayed?: number;
  isActive?: boolean;
  isLinked?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function PlayerBadge({
  name,
  skillLevel,
  matchesPlayed,
  gamesSinceLastPlayed,
  isActive = true,
  isLinked = false,
  compact = false,
  className,
  onClick,
}: PlayerBadgeProps) {
  const highlighted =
    (gamesSinceLastPlayed !== undefined && gamesSinceLastPlayed >= 3) ||
    (matchesPlayed !== undefined && matchesPlayed === 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-3 py-2",
        highlighted && "ring-2 ring-amber-400 ring-offset-1",
        !isActive && "opacity-50",
        onClick && "cursor-pointer hover:bg-gray-50 active:bg-gray-100",
        className
      )}
    >
      {/* Skill bar on left edge */}
      <div className={cn("w-1.5 rounded-full self-stretch", getSkillColor(skillLevel))} />

      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        <span className={cn("font-medium truncate", compact ? "text-sm" : "text-sm")}>
          {name}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Skill level badge */}
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
            S{skillLevel}
          </span>

          {/* Match count */}
          {matchesPlayed !== undefined && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
              {matchesPlayed}G
            </span>
          )}

          {/* Sitting indicator */}
          {gamesSinceLastPlayed !== undefined && gamesSinceLastPlayed > 0 && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-semibold",
                gamesSinceLastPlayed >= 3
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              Sat {gamesSinceLastPlayed}
            </span>
          )}

          {/* Linked LINE account indicator */}
          {isLinked && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
              LINE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
