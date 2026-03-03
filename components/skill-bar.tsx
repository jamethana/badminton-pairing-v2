import { cn } from "@/lib/utils";

interface SkillBarProps {
  level: number; // 1-10
  className?: string;
  showLabel?: boolean;
}

const SKILL_COLORS: Record<number, string> = {
  1: "bg-blue-300",
  2: "bg-blue-400",
  3: "bg-cyan-400",
  4: "bg-teal-400",
  5: "bg-green-400",
  6: "bg-yellow-400",
  7: "bg-orange-400",
  8: "bg-orange-500",
  9: "bg-red-400",
  10: "bg-red-600",
};

const SKILL_TEXT_COLORS: Record<number, string> = {
  1: "text-blue-300",
  2: "text-blue-400",
  3: "text-cyan-400",
  4: "text-teal-400",
  5: "text-green-400",
  6: "text-yellow-400",
  7: "text-orange-400",
  8: "text-orange-500",
  9: "text-red-400",
  10: "text-red-600",
};

export function getSkillColor(level: number): string {
  return SKILL_COLORS[Math.min(10, Math.max(1, level))] ?? "bg-green-400";
}

export function getSkillTextColor(level: number): string {
  return SKILL_TEXT_COLORS[Math.min(10, Math.max(1, level))] ?? "text-green-400";
}

export default function SkillBar({ level, className, showLabel = false }: SkillBarProps) {
  const clampedLevel = Math.min(10, Math.max(1, level));
  const colorClass = getSkillColor(clampedLevel);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className={cn("w-1.5 rounded-full", colorClass)}
        style={{ height: `${clampedLevel * 4 + 8}px` }}
        title={`Skill: ${clampedLevel}`}
      />
      {showLabel && (
        <span className={cn("text-xs font-bold", getSkillTextColor(clampedLevel))}>
          {clampedLevel}
        </span>
      )}
    </div>
  );
}
