import Image from "next/image";
import { cn } from "@/lib/utils";
import SkillBar, { getSkillColor } from "./skill-bar";

interface PlayerBadgeProps {
  name: string;
  skillLevel: number;
  pictureUrl?: string | null;
  matchesPlayed?: number;
  gamesSinceLastPlayed?: number;
  isActive?: boolean;
  isLinked?: boolean;
  showSkillLevelPill?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function PlayerBadge({
  name,
  skillLevel,
  pictureUrl,
  matchesPlayed,
  gamesSinceLastPlayed,
  isActive = true,
  isLinked = false,
  showSkillLevelPill = false,
  compact = false,
  className,
  onClick,
}: PlayerBadgeProps) {
  const highlighted =
    (gamesSinceLastPlayed !== undefined && gamesSinceLastPlayed >= 3) ||
    (matchesPlayed !== undefined && matchesPlayed === 0);

  const initials = name.trim().charAt(0).toUpperCase();

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

      {/* Avatar */}
      <div className={cn("flex-shrink-0 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center", compact ? "w-6 h-6" : "w-7 h-7")}>
        {pictureUrl ? (
          <Image
            src={pictureUrl}
            alt={name}
            width={compact ? 24 : 28}
            height={compact ? 24 : 28}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className={cn("font-semibold text-gray-500", compact ? "text-[10px]" : "text-xs")}>
            {initials}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("font-medium truncate", compact ? "text-sm" : "text-sm")}>
            {name}
          </span>
          {isLinked && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] text-green-700 flex-shrink-0">
              LINE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {showSkillLevelPill && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
              S{skillLevel}
            </span>
          )}
          {/* Match + sat summary */}
          {(matchesPlayed !== undefined || gamesSinceLastPlayed !== undefined) && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-800">
              🏸 {matchesPlayed ?? 0} · ⏱ {gamesSinceLastPlayed ?? 0}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
