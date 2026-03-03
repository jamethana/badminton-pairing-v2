"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSkillColor } from "./skill-bar";

interface Player {
  id: string;
  display_name: string;
  skill_level: number;
  matchesPlayed?: number;
  gamesSinceLastPlayed?: number;
}

interface AssignmentModalProps {
  open: boolean;
  courtNumber: number;
  sessionId: string;
  availablePlayers: Player[];
  suggestion?: {
    teamA: [string, string];
    teamB: [string, string];
  };
  onClose: () => void;
  onConfirm: (assignment: {
    teamA: [string, string];
    teamB: [string, string];
  }) => Promise<void>;
}

type TeamKey = "A1" | "A2" | "B1" | "B2";

export default function AssignmentModal({
  open,
  courtNumber,
  availablePlayers,
  suggestion,
  onClose,
  onConfirm,
}: AssignmentModalProps) {
  const [slots, setSlots] = useState<Record<TeamKey, string | null>>({
    A1: null, A2: null, B1: null, B2: null,
  });
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TeamKey | null>(null);

  useEffect(() => {
    if (open && suggestion) {
      setSlots({
        A1: suggestion.teamA[0],
        A2: suggestion.teamA[1],
        B1: suggestion.teamB[0],
        B2: suggestion.teamB[1],
      });
    } else if (open) {
      setSlots({ A1: null, A2: null, B1: null, B2: null });
    }
    setSelectedSlot(null);
  }, [open, suggestion]);

  const assignedIds = Object.values(slots).filter((v): v is string => v !== null);
  const remainingPlayers = availablePlayers.filter((p) => !assignedIds.includes(p.id));

  const getPlayer = (id: string | null) =>
    id ? availablePlayers.find((p) => p.id === id) : null;

  const handleSlotClick = (key: TeamKey) => {
    setSelectedSlot(selectedSlot === key ? null : key);
  };

  const handlePlayerClick = (playerId: string) => {
    if (!selectedSlot) return;
    const existingSlotKey = (Object.entries(slots) as [TeamKey, string | null][]).find(
      ([, v]) => v === playerId
    )?.[0];

    if (existingSlotKey) {
      setSlots((prev) => ({
        ...prev,
        [existingSlotKey]: prev[selectedSlot],
        [selectedSlot]: playerId,
      }));
    } else {
      setSlots((prev) => ({ ...prev, [selectedSlot]: playerId }));
    }
    setSelectedSlot(null);
  };

  const handleRemoveSlot = (key: TeamKey) => {
    setSlots((prev) => ({ ...prev, [key]: null }));
    setSelectedSlot(null);
  };

  const allFilled = Object.values(slots).every((v) => v !== null);

  const handleConfirm = async () => {
    if (!allFilled) return;
    setLoading(true);
    try {
      await onConfirm({
        teamA: [slots.A1!, slots.A2!],
        teamB: [slots.B1!, slots.B2!],
      });
    } finally {
      setLoading(false);
    }
  };

  const teamASkill =
    (getPlayer(slots.A1)?.skill_level ?? 0) + (getPlayer(slots.A2)?.skill_level ?? 0);
  const teamBSkill =
    (getPlayer(slots.B1)?.skill_level ?? 0) + (getPlayer(slots.B2)?.skill_level ?? 0);

  const skillDiff = Math.abs(teamASkill - teamBSkill);

  const TEAM_KEYS: [TeamKey, TeamKey][] = [["A1", "A2"], ["B1", "B2"]];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Court {courtNumber} Assignment</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Teams */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {TEAM_KEYS.map((teamKeys, teamIdx) => {
            const teamLabel = teamIdx === 0 ? "A" : "B";
            const teamSkill = teamIdx === 0 ? teamASkill : teamBSkill;
            return (
              <div key={teamLabel} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Team {teamLabel}</span>
                  {teamSkill > 0 && (
                    <span className="text-xs text-gray-400">S:{teamSkill}</span>
                  )}
                </div>
                {teamKeys.map((key) => {
                  const player = getPlayer(slots[key]);
                  const isSelected = selectedSlot === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleSlotClick(key)}
                      className={cn(
                        "mt-1.5 flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
                        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "bg-gray-50 hover:bg-gray-100",
                        player && "bg-white border"
                      )}
                    >
                      {player ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <div className={cn("w-1 h-8 rounded-full flex-shrink-0", getSkillColor(player.skill_level))} />
                          <span className="flex-1 text-sm font-medium truncate">{player.display_name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveSlot(key); }}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            x
                          </button>
                        </div>
                      ) : (
                        <span className={cn("text-sm text-gray-400", isSelected && "text-blue-600 font-medium")}>
                          {isSelected ? "Tap a player below" : "Empty slot"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Skill balance indicator */}
        {teamASkill > 0 && teamBSkill > 0 && (
          <div className="mb-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500">Balance:</span>
            <span className={cn("font-semibold", skillDiff <= 2 ? "text-green-600" : "text-orange-500")}>
              {teamASkill} vs {teamBSkill}
              {skillDiff <= 2 ? " (Fair)" : " (diff: " + skillDiff + ")"}
            </span>
          </div>
        )}

        {/* Available players strip */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            {selectedSlot
              ? "Select player for Team " + selectedSlot[0] + " Slot " + selectedSlot[1]
              : "Available Players - tap a slot first"}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {remainingPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handlePlayerClick(player.id)}
                disabled={!selectedSlot}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                  selectedSlot
                    ? "hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                    : "opacity-60 cursor-default"
                )}
              >
                <div className={cn("h-4 w-1 rounded-full", getSkillColor(player.skill_level))} />
                <span className="font-medium">{player.display_name}</span>
                <span className="text-xs text-gray-400">S{player.skill_level}</span>
                {player.gamesSinceLastPlayed !== undefined && player.gamesSinceLastPlayed > 0 && (
                  <span className="rounded bg-amber-100 px-1 text-xs text-amber-700">
                    {player.gamesSinceLastPlayed}
                  </span>
                )}
              </button>
            ))}
            {remainingPlayers.length === 0 && (
              <p className="text-sm text-gray-400 italic">All available players assigned</p>
            )}
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!allFilled || loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? "Starting..." : "Start Match"}
        </Button>
      </div>
    </div>
  );
}
