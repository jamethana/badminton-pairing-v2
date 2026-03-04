"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getSkillColor } from "./skill-bar";

interface PlayerInfo {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url?: string | null;
}

interface CourtCardProps {
  courtNumber: number;
  courtLabel?: string;
  teamA?: [PlayerInfo, PlayerInfo];
  teamB?: [PlayerInfo, PlayerInfo];
  status?: "in_progress" | "available";
  isPending?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  onRenameStart?: () => void;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

function PlayerSlot({ player }: { player: PlayerInfo }) {
  const initials = player.display_name.trim().charAt(0).toUpperCase();
  return (
    <div className="flex min-h-[44px] items-center gap-2 rounded-lg bg-white px-2 py-2">
      <div
        className={cn(
          "h-8 w-1 rounded-full flex-shrink-0",
          getSkillColor(player.skill_level)
        )}
      />
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
        {player.picture_url ? (
          <Image
            src={player.picture_url}
            alt={player.display_name}
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-gray-500">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {player.display_name}
        </p>
      </div>
    </div>
  );
}

function TeamSlot({ players, label }: { players?: [PlayerInfo, PlayerInfo]; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
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
  courtLabel,
  teamA,
  teamB,
  status = "available",
  isPending = false,
  isRenaming = false,
  renameValue = "",
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onRenameStart,
  onRemove,
  onClick,
  className,
}: CourtCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  const displayName = courtLabel || `Court ${courtNumber}`;

  return (
    <div
      onClick={!isRenaming ? onClick : undefined}
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-shadow",
        status === "in_progress" && "border-green-200 shadow-green-50",
        isPending && "opacity-60",
        onClick && !isPending && !isRenaming && "cursor-pointer hover:shadow-md",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        {/* Court label / inline rename */}
        {isRenaming ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onRenameSubmit?.(); }}
            className="flex flex-1 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => onRenameChange?.(e.target.value)}
              placeholder={`Court ${courtNumber}`}
              className="flex-1 rounded border px-2 py-0.5 text-sm font-bold text-gray-700 focus:border-green-400 focus:outline-none"
            />
            <button type="submit" className="text-xs text-green-600 hover:underline">Save</button>
            <button type="button" onClick={() => onRenameCancel?.()} className="text-xs text-gray-400 hover:underline">✕</button>
          </form>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-sm font-bold text-gray-700 truncate">{displayName}</span>
            {onRenameStart && (
              <button
                onClick={(e) => { e.stopPropagation(); onRenameStart(); }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                title="Rename court"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Remove court button */}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500"
              title="Remove court"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
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
