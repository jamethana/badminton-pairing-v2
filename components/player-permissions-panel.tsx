"use client";

import { useState } from "react";
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

const PERMISSIONS = [
  {
    key: "allow_player_assign_empty_court" as const,
    label: "Assign players to empty courts",
    description: "Players can open the assignment modal and start a new game on any available court.",
  },
  {
    key: "allow_player_record_own_result" as const,
    label: "Record result for own match",
    description: "Players can record the winner of a game they are personally playing in.",
  },
  {
    key: "allow_player_record_any_result" as const,
    label: "Record result for any match",
    description: "Players can record the winner of any game in this session (implies own match).",
  },
] as const;

export default function PlayerPermissionsPanel({
  sessionId,
  initialPermissions,
}: PlayerPermissionsPanelProps) {
  const [permissions, setPermissions] = useState<PlayerPermissions>(initialPermissions);
  const [saving, setSaving] = useState<keyof PlayerPermissions | null>(null);

  const handleToggle = async (key: keyof PlayerPermissions) => {
    const current = permissions[key];
    const next = !current;

    // Optimistic update
    setPermissions((prev) => ({ ...prev, [key]: next }));
    setSaving(key);

    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });

    if (!res.ok) {
      // Rollback
      setPermissions((prev) => ({ ...prev, [key]: current }));
    }

    setSaving(null);
  };

  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Player Permissions</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Control what actions players can perform in this session.
        </p>
      </div>
      <div className="divide-y">
        {PERMISSIONS.map(({ key, label, description }) => {
          const isOn = permissions[key];
          const isSaving = saving === key;
          const impliedByAny =
            key === "allow_player_record_own_result" && permissions.allow_player_record_any_result;

          return (
            <div key={key} className="flex items-start gap-3 px-4 py-3">
              <button
                type="button"
                role="switch"
                aria-checked={isOn || impliedByAny}
                disabled={isSaving || !!impliedByAny}
                onClick={() => handleToggle(key)}
                className={cn(
                  "relative mt-0.5 flex-shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                  (isOn || impliedByAny) ? "bg-green-500" : "bg-gray-200",
                  (isSaving || impliedByAny) && "opacity-60 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    (isOn || impliedByAny) ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", (isOn || impliedByAny) ? "text-gray-900" : "text-gray-500")}>
                  {label}
                  {impliedByAny && (
                    <span className="ml-2 text-xs font-normal text-green-600">(implied by "any match")</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
