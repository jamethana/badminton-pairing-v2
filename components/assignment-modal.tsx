"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSkillTextColor } from "./skill-bar";

interface Player {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url?: string | null;
  matchesPlayed?: number;
  gamesSinceLastPlayed?: number;
}

function PlayerAvatar({ player, size = 28 }: { player: Player; size?: number }) {
  const initials = player.display_name.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="flex-shrink-0 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center"
    >
      {player.picture_url ? (
        <Image
          src={player.picture_url}
          alt={player.display_name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-[10px] font-semibold text-gray-500">{initials}</span>
      )}
    </div>
  );
}

interface AssignmentModalProps {
  courtNumber: number;
  sessionId: string;
  availablePlayers: Player[];
  suggestion?: {
    teamA: [string, string];
    teamB: [string, string];
  };
  suggestionLoading?: boolean;
  onClose: () => void;
  onConfirm: (assignment: {
    teamA: [string, string];
    teamB: [string, string];
  }) => Promise<void>;
}

type TeamKey = "A1" | "A2" | "B1" | "B2";

export default function AssignmentModal({
  courtNumber,
  availablePlayers,
  suggestion,
  suggestionLoading,
  onClose,
  onConfirm,
}: AssignmentModalProps) {
  const [slots, setSlots] = useState<Record<TeamKey, string | null>>({
    A1: null, A2: null, B1: null, B2: null,
  });
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TeamKey | null>(null);
  const [longPressKey, setLongPressKey] = useState<TeamKey | null>(null);

  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleSlotLongPressStart = (key: TeamKey) => {
    clearLongPress();
    longPressTriggeredRef.current = false;
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setLongPressKey(key);
    }, 500);
  };

  const handleSlotLongPressEnd = () => {
    clearLongPress();
  };

  useEffect(() => {
    if (suggestion) {
      setSlots((prev) => {
        const hasManualSelection = Object.values(prev).some((v) => v !== null);
        if (hasManualSelection) return prev;
        return {
          A1: suggestion.teamA[0],
          A2: suggestion.teamA[1],
          B1: suggestion.teamB[0],
          B2: suggestion.teamB[1],
        };
      });
      setSelectedSlot(null);
    }
  }, [suggestion]);

  const assignedIds = Object.values(slots).filter((v): v is string => v !== null);
  const remainingPlayers = availablePlayers.filter((p) => !assignedIds.includes(p.id));

  const getPlayer = (id: string | null) =>
    id ? availablePlayers.find((p) => p.id === id) : null;

  const handleSlotClick = (key: TeamKey) => {
    if (longPressTriggeredRef.current) {
      // Long press just fired; don't also treat this as a tap.
      longPressTriggeredRef.current = false;
      return;
    }

    setLongPressKey(null);
    if (key === selectedSlot) {
      setSelectedSlot(null);
    } else if (selectedSlot !== null) {
      // Swap the two slots
      setSlots((prev) => ({
        ...prev,
        [selectedSlot]: prev[key],
        [key]: prev[selectedSlot],
      }));
      setSelectedSlot(null);
    } else {
      setSelectedSlot(key);
    }
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
    setLongPressKey(null);
  };

  // Suggest a best-match player for the currently selected slot
  const suggestedPlayerId = useMemo(() => {
    if (!selectedSlot || remainingPlayers.length === 0) return null;

    // For each candidate, simulate filling this slot and measure:
    // 1) Who has waited longest (gamesSinceLastPlayed)
    // 2) Then who has played fewer games
    // 3) Then which choice best balances total team skill A vs B.
    const scoreFor = (player: Player) => {
      const simulatedSlots: Record<TeamKey, string | null> = {
        ...slots,
        [selectedSlot]: player.id,
      };

      const getSimPlayer = (key: TeamKey) =>
        simulatedSlots[key] ? getPlayer(simulatedSlots[key]) : null;

      const teamASkillSim =
        (getSimPlayer("A1")?.skill_level ?? 0) +
        (getSimPlayer("A2")?.skill_level ?? 0);
      const teamBSkillSim =
        (getSimPlayer("B1")?.skill_level ?? 0) +
        (getSimPlayer("B2")?.skill_level ?? 0);

      const sat = player.gamesSinceLastPlayed ?? 0;
      const played = player.matchesPlayed ?? 0;
      const diff = Math.abs(teamASkillSim - teamBSkillSim);

      return { sat, played, diff };
    };

    const scored = [...remainingPlayers].toSorted((a, b) => {
      const sa = scoreFor(a);
      const sb = scoreFor(b);

      // 1) Prioritise team balance first: smaller diff is better
      if (sa.diff !== sb.diff) return sa.diff - sb.diff;
      // 2) Then longest sat time
      if (sa.sat !== sb.sat) return sb.sat - sa.sat;
      // 3) Then fewer total games played
      return sa.played - sb.played;
    });

    return scored[0]?.id ?? null;
  }, [selectedSlot, remainingPlayers, slots]);

  const suggestedPlayer =
    suggestedPlayerId != null
      ? remainingPlayers.find((p) => p.id === suggestedPlayerId) ?? null
      : null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Use full height on mobile so content isn't cramped */}
      <div className="flex w-full max-w-lg flex-col rounded-t-2xl bg-white sm:max-h-[90vh] sm:rounded-2xl">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="overflow-y-auto px-5 pb-5 pt-2">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Court {courtNumber}</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Teams — 2-column grid */}
          <div className="mb-3 grid grid-cols-2 gap-3">
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
                    const isSwapTarget = !isSelected && selectedSlot !== null;
                    return (
                      <div
                        key={key}
                        onClick={() => handleSlotClick(key)}
                        onMouseDown={() => handleSlotLongPressStart(key)}
                        onMouseUp={handleSlotLongPressEnd}
                        onMouseLeave={handleSlotLongPressEnd}
                        onTouchStart={() => handleSlotLongPressStart(key)}
                        onTouchEnd={handleSlotLongPressEnd}
                        onTouchCancel={handleSlotLongPressEnd}
                        className={cn(
                          "mt-1.5 flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
                          isSelected && "ring-2 ring-blue-500 bg-blue-50",
                          isSwapTarget && "hover:ring-1 hover:ring-blue-300 hover:bg-blue-50",
                          !isSelected && !isSwapTarget && "bg-gray-50 hover:bg-gray-100",
                          player && !isSelected && "bg-white border",
                        )}
                      >
                        {suggestionLoading && !player ? (
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-8 w-1 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                            <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                          </div>
                        ) : player ? (
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            <PlayerAvatar player={player} size={28} />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium leading-tight">
                                {player.display_name}
                              </p>
                              <p className="text-[10px] text-gray-400 leading-tight">
                                {(player.matchesPlayed ?? 0)}{" "}
                                {(player.matchesPlayed ?? 0) === 1 ? "played" : "played"}
                                <span
                                  className={cn(
                                    "ml-1",
                                    (player.gamesSinceLastPlayed ?? 0) >= 3
                                      ? "text-amber-600"
                                      : "text-gray-400"
                                  )}
                                >
                                  · ⏱ {player.gamesSinceLastPlayed ?? 0}
                                </span>
                              </p>
                            </div>
                            {longPressKey === key && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSlot(key);
                                }}
                                className="flex h-7 px-2 items-center justify-center rounded-full bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 flex-shrink-0"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className={cn("text-sm text-gray-400", isSelected && "text-blue-600 font-medium")}>
                            {isSelected ? "Tap a player or another slot" : "Empty slot"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Skill balance */}
          {teamASkill > 0 && teamBSkill > 0 && (
            <div className="mb-3 flex items-center justify-center gap-2 text-xs">
              <span className="text-gray-500">Balance:</span>
              <span
                className={cn(
                  "font-semibold",
                  skillDiff <= 1
                    ? "text-green-600"
                    : skillDiff <= 3
                      ? "text-amber-600"
                      : "text-red-500"
                )}
              >
                {skillDiff <= 1
                  ? "Very Fair"
                  : skillDiff <= 3
                    ? "Kinda Fair"
                    : "Not Fair"}
              </span>
            </div>
          )}

          {/* Available players — grid on mobile, larger cards */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              {selectedSlot
                ? `Team ${selectedSlot[0]} Slot ${selectedSlot[1]} selected — tap a player or another slot to swap`
                : "Available Players — tap a slot first"}
            </p>
            {selectedSlot && suggestedPlayer && (
              <p className="mb-2 text-[11px] text-gray-500">
                Suggestion:{" "}
                <span className="font-semibold text-gray-800">
                  S{suggestedPlayer.skill_level} {suggestedPlayer.display_name}
                </span>
                <span className="text-gray-400">
                  {" "}
                  · {suggestedPlayer.matchesPlayed ?? 0}{" "}
                  {(suggestedPlayer.matchesPlayed ?? 0) === 1 ? "played" : "played"}
                  <span
                    className={cn(
                      "ml-1",
                      (suggestedPlayer.gamesSinceLastPlayed ?? 0) >= 3
                        ? "text-amber-600"
                        : "text-gray-400"
                    )}
                  >
                    · ⏱ {suggestedPlayer.gamesSinceLastPlayed ?? 0}
                  </span>
                </span>
              </p>
            )}

            {remainingPlayers.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {remainingPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    disabled={!selectedSlot}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm",
                      "min-h-[52px] w-full sm:w-auto",
                      selectedSlot
                        ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50"
                        : "cursor-default opacity-50"
                      ,
                      selectedSlot && player.id === suggestedPlayerId && "border-green-500 ring-1 ring-green-400"
                    )}
                  >
                    <PlayerAvatar player={player} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {player.display_name}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {(player.matchesPlayed ?? 0)}{" "}
                        {(player.matchesPlayed ?? 0) === 1 ? "played" : "played"}
                        <span
                          className={cn(
                            "ml-1",
                            (player.gamesSinceLastPlayed ?? 0) >= 3
                              ? "text-amber-600 font-semibold"
                              : ""
                          )}
                        >
                          · ⏱ {player.gamesSinceLastPlayed ?? 0}
                        </span>
                      </p>
                    </div>
                    {selectedSlot && player.id === suggestedPlayerId && (
                      <span className="ml-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Suggested
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">All available players assigned</p>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!allFilled || loading}
            className="w-full bg-green-600 py-6 text-base hover:bg-green-700"
          >
            {loading ? "Starting…" : "Start Match"}
          </Button>
        </div>
      </div>
    </div>
  );
}
