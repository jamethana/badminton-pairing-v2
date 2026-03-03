"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getSkillColor, getSkillTextColor } from "@/components/skill-bar";
import type { Tables } from "@/types/database";

type AppUser = Tables<"users">;

interface Props {
  initialPlayers: AppUser[];
}

export default function PlayersClient({ initialPlayers }: Props) {
  const [players, setPlayers] = useState(initialPlayers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ display_name: string; skill_level: number }>({
    display_name: "",
    skill_level: 5,
  });
  const [saving, setSaving] = useState(false);

  const startEdit = (player: AppUser) => {
    setEditingId(player.id);
    setEditForm({ display_name: player.display_name, skill_level: player.skill_level });
  };

  const saveEdit = async (playerId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-center">Skill</th>
            <th className="px-4 py-3 text-center">LINE</th>
            <th className="px-4 py-3 text-center">Role</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {players.map((player) => (
            <tr key={player.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                {editingId === player.id ? (
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, display_name: e.target.value }))
                    }
                    className="rounded border px-2 py-1 text-sm focus:border-green-400 focus:outline-none w-48"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {player.picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.picture_url}
                        alt={player.display_name}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                          getSkillColor(player.skill_level)
                        )}
                      >
                        {player.display_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{player.display_name}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {editingId === player.id ? (
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.skill_level}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, skill_level: parseInt(e.target.value) }))
                    }
                    className="w-16 rounded border px-2 py-1 text-center text-sm focus:border-green-400 focus:outline-none"
                  />
                ) : (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      getSkillTextColor(player.skill_level),
                      "bg-gray-100"
                    )}
                  >
                    {player.skill_level}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {player.line_user_id ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    Linked
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">–</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {player.is_moderator ? (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                    Mod
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Player</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === player.id ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(player.id)}
                      disabled={saving}
                      className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {saving ? "..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(player)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                No players yet. They&apos;ll appear here once they sign in via LINE.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
