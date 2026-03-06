"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import { computePlayerStats } from "@/lib/utils/session-stats";
import type { Tables } from "@/types/database";
import type { PairingWithResult } from "@/lib/utils/session-stats";

type SessionPlayer = {
  id: string;
  is_active: boolean;
  users: Tables<"users"> | null;
};

interface SessionStatsTabProps {
  sessionPlayers: SessionPlayer[];
  pairings: PairingWithResult[];
  /** When true, hide Skill and Sat to reduce competitiveness (e.g. player-facing results). */
  hideCompetitiveStats?: boolean;
}

type StatsSortCol = "name" | "played" | "wins" | "losses" | "winPct" | "sat" | "skill";

export default function SessionStatsTab({
  sessionPlayers,
  pairings,
  hideCompetitiveStats = false,
}: SessionStatsTabProps) {
  const [sortCol, setSortCol] = useState<StatsSortCol>("played");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (col: StatsSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const statsMap = useMemo(
    () =>
      computePlayerStats(
        pairings,
        sessionPlayers.map((sp) => sp.users?.id).filter((id): id is string => id !== null)
      ),
    [pairings, sessionPlayers]
  );

  const sortedRows = useMemo(() => {
    const rows = sessionPlayers
      .filter((sp) => sp.users)
      .map((sp) => {
        const s = statsMap.get(sp.users!.id);
        const played = s?.matchesPlayed ?? 0;
        const wins = s?.wins ?? 0;
        const losses = s?.losses ?? 0;
        const winPct = played > 0 ? wins / played : -1;
        return {
          sp,
          user: sp.users!,
          matchesPlayed: played,
          wins,
          losses,
          winPct,
          gamesSince: s?.gamesSinceLastPlayed ?? 0,
        };
      });

    const effectiveSortCol =
      hideCompetitiveStats && (sortCol === "sat" || sortCol === "skill") ? "played" : sortCol;
    const dir = sortDir === "asc" ? 1 : -1;
    return rows.toSorted((a, b) => {
      switch (effectiveSortCol) {
        case "name":
          return dir * a.user.display_name.localeCompare(b.user.display_name);
        case "played":
          return dir * (a.matchesPlayed - b.matchesPlayed);
        case "wins":
          return dir * (a.wins - b.wins);
        case "losses":
          return dir * (a.losses - b.losses);
        case "winPct":
          return dir * (a.winPct - b.winPct);
        case "sat":
          return dir * (a.gamesSince - b.gamesSince);
        case "skill":
          return dir * (a.user.skill_level - b.user.skill_level);
        default:
          return 0;
      }
    });
  }, [sessionPlayers, statsMap, sortCol, sortDir, hideCompetitiveStats]);

  const allSortPills: { col: StatsSortCol; label: string }[] = [
    { col: "name", label: "Name" },
    { col: "played", label: "Played" },
    { col: "wins", label: "W" },
    { col: "losses", label: "L" },
    { col: "winPct", label: "Win%" },
    { col: "sat", label: "Sat" },
    { col: "skill", label: "Skill" },
  ];
  const sortPills = hideCompetitiveStats
    ? allSortPills.filter((p) => p.col !== "sat" && p.col !== "skill")
    : allSortPills;

  return (
    <div className="rounded-xl border bg-white">
      {/* Sort pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
        <span className="mr-1 text-xs text-gray-400">Sort:</span>
        {sortPills.map(({ col, label }) => (
          <button
            key={col}
            onClick={() => handleSort(col)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              sortCol === col
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {label}
            {sortCol === col && (
              <span className="ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Player rows */}
      <div className="divide-y">
        {sortedRows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No players in this session.</p>
        )}
        {sortedRows.map(({ sp, user, matchesPlayed, wins, losses, winPct, gamesSince }) => (
          <div
            key={sp.id}
            className={cn("flex items-center gap-3 px-4 py-3", !sp.is_active && "opacity-50")}
          >
            {user.picture_url ? (
              <img
                src={user.picture_url}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500"
                aria-hidden
              >
                {(user.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className={cn("h-10 w-1.5 flex-shrink-0 rounded-full", getSkillColor(user.skill_level))} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{user.display_name}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                <span className="text-xs text-gray-400">{matchesPlayed} played</span>
                <span className="text-xs font-semibold text-green-600">{wins}W</span>
                <span className="text-xs font-semibold text-red-500">{losses}L</span>
                {matchesPlayed > 0 && (
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      winPct >= 0.5 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {Math.round(winPct * 100)}%
                  </span>
                )}
                {!hideCompetitiveStats && (
                  <>
                    <span
                      className={cn(
                        "text-xs",
                        gamesSince >= 3 ? "font-semibold text-amber-600" : "text-gray-400"
                      )}
                    >
                      ⏱ {gamesSince}
                    </span>
                    <span className="text-xs text-gray-400">S{user.skill_level}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
