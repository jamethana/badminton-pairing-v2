"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerPermissions {
  allow_player_assign_empty_court: boolean;
  allow_player_record_own_result: boolean;
  allow_player_record_any_result: boolean;
}

interface PlayerPermissionsPanelProps {
  sessionId: string;
  initialPermissions: PlayerPermissions;
}

type ResultLevel = "none" | "own" | "any";

const RESULT_LEVELS: { value: ResultLevel; label: string; description: string }[] = [
  {
    value: "none",
    label: "Moderators only",
    description: "Only moderators can record results.",
  },
  {
    value: "own",
    label: "Own matches",
    description: "Players can report the result of games they are playing in.",
  },
  {
    value: "any",
    label: "Any match",
    description: "Players can report results for any game in this session.",
  },
];

function deriveResultLevel(permissions: PlayerPermissions): ResultLevel {
  if (permissions.allow_player_record_any_result) return "any";
  if (permissions.allow_player_record_own_result) return "own";
  return "none";
}

function resultLevelToFlags(level: ResultLevel): Pick<
  PlayerPermissions,
  "allow_player_record_own_result" | "allow_player_record_any_result"
> {
  return {
    allow_player_record_own_result: level === "own",
    allow_player_record_any_result: level === "any",
  };
}

export default function PlayerPermissionsPanel({
  sessionId,
  initialPermissions,
}: PlayerPermissionsPanelProps) {
  const [permissions, setPermissions] = useState<PlayerPermissions>(initialPermissions);
  const [courtSaving, setCourtSaving] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);

  const resultLevel = deriveResultLevel(permissions);
  const headingId = useId();
  const radioGroupRef = useRef<HTMLDivElement>(null);

  // ── Court assignment toggle ───────────────────────────────────────────────
  const handleCourtToggle = async () => {
    const current = permissions.allow_player_assign_empty_court;
    const next = !current;
    setPermissions((prev) => ({ ...prev, allow_player_assign_empty_court: next }));
    setCourtSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow_player_assign_empty_court: next }),
    });
    if (!res.ok) {
      setPermissions((prev) => ({ ...prev, allow_player_assign_empty_court: current }));
    }
    setCourtSaving(false);
  };

  // ── Result level segmented control ───────────────────────────────────────
  const handleResultLevel = async (level: ResultLevel) => {
    if (level === resultLevel || resultSaving) return;
    const flags = resultLevelToFlags(level);
    const prev = { ...permissions };
    setPermissions((p) => ({ ...p, ...flags }));
    setResultSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flags),
    });
    if (!res.ok) {
      setPermissions(prev);
    }
    setResultSaving(false);
  };

  // Arrow-key navigation within the radio group
  const handleResultKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIdx: number
  ) => {
    const buttons = radioGroupRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]'
    );
    if (!buttons) return;
    let nextIdx = currentIdx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % RESULT_LEVELS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + RESULT_LEVELS.length) % RESULT_LEVELS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = RESULT_LEVELS.length - 1;
    } else {
      return;
    }
    buttons[nextIdx].focus();
    handleResultLevel(RESULT_LEVELS[nextIdx].value);
  };

  const selectedResultOption = RESULT_LEVELS.find((l) => l.value === resultLevel)!;

  return (
    <div className="rounded-xl border bg-white">
      {/* Panel header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Player Permissions</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Control what actions players can perform in this session.
        </p>
      </div>

      <div className="divide-y">
        {/* ── Court assignment toggle ── */}
        <div className="flex items-start gap-3 px-4 py-3">
          <button
            type="button"
            role="switch"
            aria-checked={permissions.allow_player_assign_empty_court}
            aria-label="Allow players to assign games to empty courts"
            disabled={courtSaving}
            onClick={handleCourtToggle}
            className={cn(
              "relative mt-0.5 flex-shrink-0 h-5 w-9 rounded-full transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1",
              permissions.allow_player_assign_empty_court ? "bg-green-500" : "bg-gray-200",
              courtSaving && "opacity-60 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                permissions.allow_player_assign_empty_court ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-medium",
                permissions.allow_player_assign_empty_court ? "text-gray-900" : "text-gray-500"
              )}
            >
              Assign games to empty courts
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Players can start a new game on any available court.
            </p>
          </div>
        </div>

        {/* ── Result recording level ── */}
        <div className="px-4 py-3">
          <p
            id={headingId}
            className="mb-2 text-sm font-medium text-gray-700"
          >
            Who can record match results?
          </p>

          {/* Segmented radio group */}
          <div
            ref={radioGroupRef}
            role="radiogroup"
            aria-labelledby={headingId}
            className={cn(
              "flex rounded-lg border border-gray-200 overflow-hidden",
              resultSaving && "opacity-60 pointer-events-none"
            )}
          >
            {RESULT_LEVELS.map(({ value, label }, idx) => {
              const isSelected = value === resultLevel;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleResultLevel(value)}
                  onKeyDown={(e) => handleResultKeyDown(e, idx)}
                  className={cn(
                    "flex-1 min-w-0 px-2 py-2 text-xs font-medium text-center transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500",
                    idx > 0 && "border-l border-gray-200",
                    isSelected
                      ? "bg-green-600 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Helper text for selected level */}
          <p className="mt-1.5 text-xs text-gray-400">
            {selectedResultOption.description}
          </p>
        </div>
      </div>
    </div>
  );
}
