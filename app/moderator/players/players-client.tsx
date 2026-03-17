"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [addPlayerLoading, setAddPlayerLoading] = useState(false);
  const [deletePlayerLoading, setDeletePlayerLoading] = useState(false);

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

  const confirmDelete = async (playerId: string) => {
    const original = players.find((p) => p.id === playerId);
    if (!original) return;
    setDeletePlayerLoading(true);
    const res = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    setDeletePlayerLoading(false);
    setPendingDeleteId(null);
    if (res.ok) {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } else {
      setPlayers((prev) =>
        [...prev, original].toSorted((a, b) => a.display_name.localeCompare(b.display_name))
      );
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addForm.display_name.trim();
    if (!name || addPlayerLoading) return;
    setAddError("");

    if (players.some((p) => p.display_name.trim().toLowerCase() === name.toLowerCase())) {
      setAddError("A player with that name already exists.");
      return;
    }

    setAddPlayerLoading(true);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name, skill_level: addForm.skill_level }),
    });
    if (res.ok) {
      const created = (await res.json()) as AppUser;
      setPlayers((prev) =>
        [...prev, created].toSorted((a, b) => a.display_name.localeCompare(b.display_name))
      );
      setAddForm({ display_name: "", skill_level: 3 });
      setShowAddForm(false);
    } else {
      const json = await res.json().catch(() => ({}));
      setAddError(json.error ?? "Failed to add player");
    }
    setAddPlayerLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Player panel */}
      {showAddForm ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-green-800">Add New Player</h2>
          <form
            onSubmit={addPlayer}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="min-w-0 flex-1 sm:min-w-[10rem]">
              <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                placeholder="Player name"
                value={addForm.display_name}
                onChange={(e) => setAddForm((f) => ({ ...f, display_name: e.target.value }))}
                className="min-w-0 w-full rounded border px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
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
            <div className="flex min-h-[44px] flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="min-h-[44px] rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!addForm.display_name.trim() || addPlayerLoading}
                className="min-h-[44px] rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {addPlayerLoading ? "Adding…" : "Add Player"}
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Add Player
          </button>
        </div>
      )}

      {/* Players: card list on mobile */}
      <div className="space-y-3 md:hidden">
        {players.length === 0 ? (
          <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-400">
            No players yet. Add one above or they&apos;ll appear here once they sign in via LINE.
          </div>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              {editingId === player.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, display_name: e.target.value }))
                    }
                    className="w-full min-w-0 rounded border px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editForm.skill_level}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, skill_level: parseInt(e.target.value) }))
                      }
                      className="w-16 rounded border px-2 py-1.5 text-center text-sm focus:border-green-400 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(player.id)}
                        className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {player.picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.picture_url}
                          alt={player.display_name}
                          className="h-9 w-9 shrink-0 rounded-full"
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                            getSkillColor(player.skill_level)
                          )}
                        >
                          {player.display_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-medium">{player.display_name}</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold bg-gray-100",
                              getSkillTextColor(player.skill_level)
                            )}
                          >
                            {player.skill_level}
                          </span>
                          {player.line_user_id ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                              Linked
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                              Not linked
                            </span>
                          )}
                          {player.is_moderator && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                              Mod
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {player.id.startsWith("temp-") ? (
                    <span className="text-xs text-gray-400">Saving…</span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/moderator/players/${player.id}`}>Stats</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startEdit(player)}>
                          Edit
                        </DropdownMenuItem>
                        {!player.line_user_id && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDeleteId(player.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Players table (desktop) */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
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
                        className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </div>
                  ) : player.id.startsWith("temp-") ? (
                    <span className="text-xs text-gray-400">Saving…</span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/moderator/players/${player.id}`}>Stats</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startEdit(player)}>
                          Edit
                        </DropdownMenuItem>
                        {!player.line_user_id && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDeleteId(player.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              disabled={deletePlayerLoading}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => pendingDeleteId && confirmDelete(pendingDeleteId)}
              disabled={deletePlayerLoading}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deletePlayerLoading ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
