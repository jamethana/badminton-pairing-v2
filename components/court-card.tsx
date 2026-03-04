"use client";

import { cn } from "@/lib/utils";
import { getSkillColor } from "./skill-bar";

interface PlayerInfo {
  id: string;
  display_name: string;
  skill_level: number;
}

interface CourtCardProps {
  courtNumber: number;
  teamA?: [PlayerInfo, PlayerInfo];
  teamB?: [PlayerInfo, PlayerInfo];
  status?: "in_progress" | "available";
  isPending?: boolean;
  onClick?: () => void;
  className?: string;
}

function PlayerSlot({ player }: { player: PlayerInfo }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-full w-1 rounded-full", getSkillColor(player.skill_level))} />
      <span className="text-sm font-medium">{player.display_name}</span>
      <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
        {player.skill_level}
      </span>
    </div>
  );
}

function TeamSlot({ players, label }: { players?: [PlayerInfo, PlayerInfo]; label: string }) {
  const skillSum = players ? players[0].skill_level + players[1].skill_level : 0;
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        {players && (
          <span className="text-xs text-gray-400">S:{skillSum}</span>
        )}
      </div>
      {players ? (
        <div className="space-y-1.5">
          <PlayerSlot player={players[0]} />
          <PlayerSlot player={players[1]} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="h-5 rounded bg-gray-100" />
          <div className="h-5 rounded bg-gray-100" />
        </div>
      )}
    </div>
  );
}

export default function CourtCard({
  courtNumber,
  teamA,
  teamB,
  status = "available",
  isPending = false,
  onClick,
  className,
}: CourtCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-shadow",
        status === "in_progress" && "border-green-200 shadow-green-50",
        isPending && "opacity-60",
        onClick && !isPending && "cursor-pointer hover:shadow-md",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">Court {courtNumber}</span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            isPending
              ? "bg-yellow-50 text-yellow-600"
              : status === "in_progress"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {isPending && (
            <svg className="h-2.5 w-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {isPending ? "Saving…" : status === "in_progress" ? "Playing" : "Available"}
        </span>
      </div>

      {status === "available" ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
          <svg className="mb-2 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm">Tap to assign players</span>
        </div>
      ) : (
        <div className="flex items-stretch gap-3">
          <TeamSlot players={teamA} label="Team A" />
          <div className="flex items-center">
            <span className="text-xs font-bold text-gray-400">VS</span>
          </div>
          <TeamSlot players={teamB} label="Team B" />
        </div>
      )}
    </div>
  );
}
