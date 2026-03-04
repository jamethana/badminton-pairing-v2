"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSkillColor, getSkillTextColor } from "@/components/skill-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    skill_level: 3,
  });

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Add player form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ display_name: "", skill_level: 3 });
  const [addError, setAddError] = useState("");

  const startEdit = (player: AppUser) => {
    setEditingId(player.id);
    setEditForm({ display_name: player.display_name, skill_level: player.skill_level });
  };

  const saveEdit = (playerId: string) => {
    const original = players.find((p) => p.id === playerId);
    if (!original) return;

    // Optimistic: apply edit immediately and close inline form
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, ...editForm } : p))
    );
    setEditingId(null);

    fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    }).then((res) => {
      if (!res.ok) {
        // Rollback and re-open edit
        setPlayers((prev) => prev.map((p) => (p.id === playerId ? original : p)));
        startEdit(original);
      }
    });
  };

  const confirmDelete = (playerId: string) => {
    const original = players.find((p) => p.id === playerId);
    setPendingDeleteId(null);

    // Optimistic: remove immediately
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));

    fetch(`/api/players/${playerId}`, { method: "DELETE" }).then((res) => {
      if (!res.ok && original) {
        // Rollback
        setPlayers((prev) =>
          [...prev, original].toSorted((a, b) => a.display_name.localeCompare(b.display_name))
        );
      }
    });
  };

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = addForm.display_name.trim();
    if (!name) return;
    setAddError("");

    if (players.some((p) => p.display_name.trim().toLowerCase() === name.toLowerCase())) {
      setAddError("A player with that name already exists.");
      return;
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: AppUser = {
      id: tempId,
      display_name: name,
      skill_level: addForm.skill_level,
      calculated_skill_rating: null,
      is_moderator: false,
      line_user_id: null,
      picture_url: null,
      auth_secret: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic: add to list and close form immediately
    setPlayers((prev) =>
      [...prev, optimistic].toSorted((a, b) => a.display_name.localeCompare(b.display_name))
    );
    setAddForm({ display_name: "", skill_level: 3 });
    setShowAddForm(false);

    fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name, skill_level: addForm.skill_level }),
    }).then(async (res) => {
      if (res.ok) {
        const created = await res.json();
        // Replace temp entry with the real record
        setPlayers((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      } else {
        // Rollback
        setPlayers((prev) => prev.filter((p) => p.id !== tempId));
        const json = await res.json().catch(() => ({}));
        setAddError(json.error ?? "Failed to add player");
        setAddForm({ display_name: name, skill_level: addForm.skill_level });
        setShowAddForm(true);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Add Player panel */}
      {showAddForm ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-green-800">Add New Player</h2>
          <form onSubmit={addPlayer} className="flex flex-wrap items-end gap-3">
            <div className="flex-1" style={{ minWidth: "160px" }}>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                placeholder="Player name"
                value={addForm.display_name}
                onChange={(e) => setAddForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full rounded border px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex-shrink-0">
              <label className="mb-1 block text-xs font-medium text-gray-600">Skill (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={addForm.skill_level}
                onChange={(e) => setAddForm((f) => ({ ...f, skill_level: parseInt(e.target.value) || 3 }))}
                className="w-20 rounded border px-3 py-2 text-center text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!addForm.display_name.trim()}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Add Player
              </button>
            </div>
          </form>
          {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
          <p className="mt-2 text-xs text-gray-500">
            The player will appear without a LINE account. They can link their account later by logging in via LINE.
          </p>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Add Player
          </button>
        </div>
      )}

      {/* Players table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Skill</th>
              <th className="px-4 py-3 text-center">TS (hidden)</th>
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
                <td className="px-4 py-3 text-center text-[11px] text-gray-400">
                  {player.trueskill_mu != null ? (
                    <>
                      {Math.round(player.trueskill_mu)}{" "}
                      <span className="text-gray-300">σ {player.trueskill_sigma?.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="italic text-gray-300">pending</span>
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
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                      Not linked
                    </span>
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
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : player.id.startsWith("temp-") ? (
                    <span className="text-xs text-gray-400">Saving…</span>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/moderator/players/${player.id}`}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Stats
                      </Link>
                      <button
                        onClick={() => startEdit(player)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      {!player.line_user_id && !player.id.startsWith("temp-") && (
                        <button
                          onClick={() => setPendingDeleteId(player.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No players yet. Add one above or they&apos;ll appear here once they sign in via LINE.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* react-4: Inline confirmation dialog replaces window.confirm + window.alert */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete player?</DialogTitle>
            <DialogDescription>
              {pendingDeleteId && players.find((p) => p.id === pendingDeleteId)?.display_name
                ? `"${players.find((p) => p.id === pendingDeleteId)!.display_name}" will be permanently removed. This cannot be undone.`
                : "This player will be permanently removed. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setPendingDeleteId(null)}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => pendingDeleteId && confirmDelete(pendingDeleteId)}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
