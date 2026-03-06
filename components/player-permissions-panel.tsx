"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerPermissions {
  allow_player_assign_empty_court: boolean;
  allow_player_record_own_result: boolean;
  allow_player_record_any_result: boolean;
  allow_player_add_remove_courts: boolean;
  allow_player_access_invite_qr: boolean;
}

interface PlayerPermissionsPanelProps {
  sessionId: string;
  initialPermissions: PlayerPermissions;
}

type AssignmentLevel = "moderators" | "everyone";
type ResultLevel = "none" | "own" | "any";
type CourtsLevel = "moderators" | "everyone";
type InviteLevel = "moderators" | "everyone";

const ASSIGNMENT_LEVELS: {
  value: AssignmentLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "moderators",
    label: "Moderators only",
    description: "Only moderators can assign games to empty courts.",
  },
  {
    value: "everyone",
    label: "Everyone in this session",
    description: "Players can start games on any available court.",
  },
];

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

function deriveAssignmentLevel(permissions: PlayerPermissions): AssignmentLevel {
  return permissions.allow_player_assign_empty_court ? "everyone" : "moderators";
}

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
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [courtsSaving, setCourtsSaving] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);

  const assignmentLevel = deriveAssignmentLevel(permissions);
  const resultLevel = deriveResultLevel(permissions);
  const assignmentHeadingId = useId();
  const resultHeadingId = useId();
  const assignmentRadioGroupRef = useRef<HTMLDivElement>(null);
  const resultRadioGroupRef = useRef<HTMLDivElement>(null);
  const courtsToggleId = useId();
  const inviteToggleId = useId();

  // ── Court assignment level segmented control ─────────────────────────────
  const handleAssignmentLevel = async (level: AssignmentLevel) => {
    if (level === assignmentLevel || assignmentSaving) return;
    const current = assignmentLevel;
    const allow_player_assign_empty_court = level === "everyone";
    setPermissions((prev) => ({ ...prev, allow_player_assign_empty_court }));
    setAssignmentSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow_player_assign_empty_court }),
    });
    if (!res.ok) {
      setPermissions((prev) => ({
        ...prev,
        allow_player_assign_empty_court: current === "everyone",
      }));
    }
    setAssignmentSaving(false);
  };

  const handleAssignmentKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIdx: number
  ) => {
    const buttons = assignmentRadioGroupRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]'
    );
    if (!buttons) return;
    let nextIdx = currentIdx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % ASSIGNMENT_LEVELS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + ASSIGNMENT_LEVELS.length) % ASSIGNMENT_LEVELS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = ASSIGNMENT_LEVELS.length - 1;
    } else {
      return;
    }
    buttons[nextIdx].focus();
    handleAssignmentLevel(ASSIGNMENT_LEVELS[nextIdx].value);
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
    const buttons = resultRadioGroupRef.current?.querySelectorAll<HTMLButtonElement>(
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

  const selectedAssignmentOption = ASSIGNMENT_LEVELS.find(
    (l) => l.value === assignmentLevel
  )!;
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
        {/* ── Court assignment level ── */}
        <div className="px-4 py-3">
          <p
            id={assignmentHeadingId}
            className="mb-2 text-sm font-medium text-gray-700"
          >
            Who can assign games to empty courts?
          </p>
          <div
            ref={assignmentRadioGroupRef}
            role="radiogroup"
            aria-labelledby={assignmentHeadingId}
            className={cn(
              "flex rounded-lg border border-gray-200 overflow-hidden",
              assignmentSaving && "opacity-60 pointer-events-none"
            )}
          >
            {ASSIGNMENT_LEVELS.map(({ value, label }, idx) => {
              const isSelected = value === assignmentLevel;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleAssignmentLevel(value)}
                  onKeyDown={(e) => handleAssignmentKeyDown(e, idx)}
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
          <p className="mt-1.5 text-xs text-gray-400">
            {selectedAssignmentOption.description}
          </p>
        </div>

        {/* ── Result recording level ── */}
        <div className="px-4 py-3">
          <p
            id={resultHeadingId}
            className="mb-2 text-sm font-medium text-gray-700"
          >
            Who can record match results?
          </p>

          {/* Segmented radio group */}
          <div
            ref={resultRadioGroupRef}
            role="radiogroup"
            aria-labelledby={resultHeadingId}
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

        {/* ── Add / remove courts ── */}
        <div className="px-4 py-3">
          <p
            id={courtsToggleId}
            className="mb-2 text-sm font-medium text-gray-700"
          >
            Can players add or remove courts?
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              id={courtsToggleId}
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={permissions.allow_player_add_remove_courts}
              disabled={courtsSaving}
              onChange={async (e) => {
                const next = e.target.checked;
                const prev = permissions.allow_player_add_remove_courts;
                setPermissions((p) => ({ ...p, allow_player_add_remove_courts: next }));
                setCourtsSaving(true);
                const res = await fetch(`/api/sessions/${sessionId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ allow_player_add_remove_courts: next }),
                });
                if (!res.ok) {
                  setPermissions((p) => ({
                    ...p,
                    allow_player_add_remove_courts: prev,
                  }));
                }
                setCourtsSaving(false);
              }}
            />
            <span>
              Allow players in this session to add or remove courts (when no game is in
              progress on that court).
            </span>
          </label>
        </div>

        {/* ── Invite / QR access ── */}
        <div className="px-4 py-3">
          <p
            id={inviteToggleId}
            className="mb-2 text-sm font-medium text-gray-700"
          >
            Can players access the invite link & QR code?
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              id={inviteToggleId}
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={permissions.allow_player_access_invite_qr}
              disabled={inviteSaving}
              onChange={async (e) => {
                const next = e.target.checked;
                const prev = permissions.allow_player_access_invite_qr;
                setPermissions((p) => ({ ...p, allow_player_access_invite_qr: next }));
                setInviteSaving(true);
                const res = await fetch(`/api/sessions/${sessionId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ allow_player_access_invite_qr: next }),
                });
                if (!res.ok) {
                  setPermissions((p) => ({
                    ...p,
                    allow_player_access_invite_qr: prev,
                  }));
                }
                setInviteSaving(false);
              }}
            />
            <span>
              Show the invite button and QR code to players on the session page.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
