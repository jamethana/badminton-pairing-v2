"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";

interface Player {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url?: string | null;
}

interface ResultModalProps {
  pairingId: string;
  sessionId: string;
  teamA: [Player, Player];
  teamB: [Player, Player];
  onClose: () => void;
  onConfirm: (result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "team_a" | "team_b";
  }) => Promise<void>;
  onVoid?: () => Promise<void>;
}

export default function ResultModal({
  teamA,
  teamB,
  onClose,
  onConfirm,
  onVoid,
}: ResultModalProps) {
  const [pendingWinner, setPendingWinner] = useState<"team_a" | "team_b" | null>(null);
  const [loadingTeam, setLoadingTeam] = useState<"team_a" | "team_b" | null>(null);
  const [voidLoading, setVoidLoading] = useState(false);
  const isLoading = loadingTeam !== null || voidLoading;

  const handleTeamTap = (teamKey: "team_a" | "team_b") => {
    if (isLoading) return;
    setPendingWinner(teamKey);
  };

  const handleConfirm = async () => {
    if (!pendingWinner || isLoading) return;
    setLoadingTeam(pendingWinner);
    try {
      await onConfirm({ team_a_score: 0, team_b_score: 0, winner_team: pendingWinner });
    } finally {
      setLoadingTeam(null);
    }
  };

  const handleVoid = async () => {
    if (!onVoid || isLoading) return;
    setPendingWinner(null);
    setVoidLoading(true);
    try {
      await onVoid();
    } finally {
      setVoidLoading(false);
    }
  };

  const teams = [
    { key: "team_a" as const, label: "Team A", players: teamA },
    { key: "team_b" as const, label: "Team B", players: teamB },
  ];

  const pendingLabel = pendingWinner === "team_a" ? "Team A" : pendingWinner === "team_b" ? "Team B" : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Who won?</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Team cards — tap to select */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {teams.map(({ key, label, players }) => {
            const isSelected = pendingWinner === key;
            const isOther = pendingWinner !== null && pendingWinner !== key;
            const loading = loadingTeam === key;
            return (
              <button
                key={key}
                onClick={() => handleTeamTap(key)}
                disabled={isLoading}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex min-h-[120px] flex-col items-start rounded-2xl border-2 p-4 text-left transition-all",
                  "active:scale-95",
                  isSelected
                    ? "border-green-500 bg-green-50 ring-2 ring-green-300 ring-offset-1"
                    : isOther
                      ? "border-gray-100 bg-gray-50 opacity-40"
                      : isLoading
                        ? "border-gray-100 bg-gray-50 opacity-40"
                        : "border-gray-200 hover:border-green-400 hover:bg-green-50"
                )}
              >
                <p className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wide",
                  isSelected ? "text-green-600" : "text-gray-400"
                )}>
                  {label}
                </p>
                {players.map((p) => {
                  const initials = p.display_name.trim().charAt(0).toUpperCase();
                  return (
                    <div key={p.id} className="flex items-center gap-2 py-0.5 min-w-0">
                      <div
                        className={cn(
                          "h-3 w-1.5 rounded-full flex-shrink-0",
                          getSkillColor(p.skill_level)
                        )}
                      />
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                        {p.picture_url ? (
                          <Image
                            src={p.picture_url}
                            alt={p.display_name}
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-500">
                            {initials}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-sm font-medium text-gray-800">
                        {p.display_name}
                      </span>
                    </div>
                  );
                })}

                {/* Selected checkmark */}
                {isSelected && !loading && (
                  <div className="absolute right-3 top-3">
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Loading spinner overlay */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-green-50/80">
                    <svg className="h-6 w-6 animate-spin text-green-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirmation row */}
        {pendingWinner ? (
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setPendingWinner(null)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Change
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              autoFocus
            className="flex-[2] rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {isLoading ? "Recording…" : `Confirm ${pendingLabel} wins`}
            </button>
          </div>
        ) : (
          <p className="mb-4 text-center text-xs text-gray-400">Tap a team to select the winner</p>
        )}

        {/* Void game */}
        {onVoid && (
          <button
            onClick={handleVoid}
            disabled={isLoading}
            className="w-full rounded-xl border border-red-100 py-3 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
          >
            {voidLoading ? "Voiding…" : "Void Game"}
          </button>
        )}
      </div>
    </div>
  );
}
