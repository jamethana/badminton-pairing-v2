"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import CourtCard from "@/components/court-card";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import { createClient } from "@/lib/supabase/client";
import PlayerBadge from "@/components/player-badge";
import AssignmentModal from "@/components/assignment-modal";
import ResultModal from "@/components/result-modal";
import PlayerPermissionsPanel from "@/components/player-permissions-panel";
import { computePlayerStats, getPlayersInCurrentGame } from "@/lib/utils/session-stats";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import type { Tables, SessionStatus } from "@/types/database";

type Pairing = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};
type SessionPlayer = Tables<"session_players"> & {
  users: Tables<"users"> | null;
};

// quality-5: Narrowed prop type — only pass the fields this component actually uses
interface Props {
  session: {
    id: string;
    status: SessionStatus;
    num_courts: number;
    court_names: Record<string, string>;
    allow_player_assign_empty_court: boolean;
    allow_player_record_own_result: boolean;
    allow_player_record_any_result: boolean;
    show_skill_level_pills: boolean;
    allow_player_add_remove_courts: boolean;
    allow_player_access_invite_qr: boolean;
  };
  initialSessionPlayers: SessionPlayer[];
  initialPairings: Pairing[];
  allUsers: Tables<"users">[];
}

export default function CourtDashboardClient({
  session,
  initialSessionPlayers,
  initialPairings,
  allUsers,
}: Props) {
  const router = useRouter();
  const [sessionPlayers, setSessionPlayers] = useState(initialSessionPlayers);
  const [pairings, setPairings] = useState(initialPairings);
  const [sessionStatus, setSessionStatus] = useState(session.status);
  const [numCourts, setNumCourts] = useState(session.num_courts);
  const [courtNames, setCourtNames] = useState<Record<string, string>>(session.court_names ?? {});
  const [renamingCourt, setRenamingCourt] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeTab, setActiveTab] = useState<"game" | "stats" | "settings">("game");
  const [statusSaving, setStatusSaving] = useState(false);
  const [showSkillLevelPills, setShowSkillLevelPills] = useState(session.show_skill_level_pills);
  const [showSkillLevelPillsSaving, setShowSkillLevelPillsSaving] = useState(false);

  const isCompleted = sessionStatus === "completed";

  // Stats tab sort state
  type StatsSortCol = "name" | "active" | "played" | "wins" | "losses" | "winPct" | "sat" | "skill";
  const [statsSortCol, setStatsSortCol] = useState<StatsSortCol>("played");
  const [statsSortDir, setStatsSortDir] = useState<"asc" | "desc">("desc");

  const handleStatsSort = (col: StatsSortCol) => {
    if (statsSortCol === col) {
      setStatsSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setStatsSortCol(col);
      setStatsSortDir("desc");
    }
  };

  // Assignment modal state
  const [assignModal, setAssignModal] = useState<{
    courtNumber: number;
    existingPairingId?: string;
    suggestion?: { teamA: [string, string]; teamB: [string, string] };
    suggestionLoading?: boolean;
  } | null>(null);

  // Result modal state
  const [resultModal, setResultModal] = useState<{
    pairingId: string;
    courtNumber: number;
  } | null>(null);

  const [isAddingPlayer, startAddingPlayer] = useTransition();

  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerSkill, setNewPlayerSkill] = useState(3);
  const [newPlayerError, setNewPlayerError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sessionUpdatedToast, setSessionUpdatedToast] = useState(false);

  // Realtime: merge remote changes so multiple moderators stay in sync
  const userById = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);

  const refetchPairings = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pairings")
      .select("*, game_results(*)")
      .eq("session_id", session.id)
      .order("sequence_number", { ascending: true });
    if (data) setPairings(data as Pairing[]);
  }, [session.id]);

  useSessionRealtime(session.id, {
    onSession: (row) => {
      setSessionStatus(row.status as SessionStatus);
      setNumCourts(row.num_courts);
      setCourtNames(row.court_names ?? {});
      setShowSkillLevelPills(row.show_skill_level_pills ?? true);
    },
    onSessionPlayers: (op, row) => {
      if (op === "DELETE") {
        setSessionPlayers((prev) => prev.filter((sp) => sp.id !== row.id));
        return;
      }
      const user = userById.get(row.user_id) ?? null;
      const sp: SessionPlayer = { ...row, users: user };
      setSessionPlayers((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id);
        if (idx >= 0) {
          const merged = { ...sp, users: sp.users ?? prev[idx].users };
          return prev.map((p) => (p.id === row.id ? merged : p));
        }
        return [...prev, sp];
      });
    },
    onPairings: (op, row) => {
      if (op === "DELETE") {
        setPairings((prev) => prev.filter((p) => p.id !== row.id));
        return;
      }
      const pairing: Pairing = {
        ...row,
        status: row.status as "in_progress" | "completed" | "voided",
        game_results: null,
      };
      setPairings((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id);
        if (idx >= 0) return prev.map((p) => (p.id === row.id ? pairing : p));
        return [...prev, pairing];
      });
    },
    onGameResults: (_, row) => {
      setPairings((prev) => {
        if (!prev.some((p) => p.id === row.pairing_id)) return prev;
        void refetchPairings();
        return prev;
      });
    },
    onRemoteUpdate: () => {
      setSessionUpdatedToast(true);
      setTimeout(() => setSessionUpdatedToast(false), 3000);
    },
  });

  // react-2: Memoize all expensive derived values so they only recompute
  // when their dependencies change — not on every keypress in the add-player form.
  const busyIds = useMemo(() => getPlayersInCurrentGame(pairings), [pairings]);

  const statsMap = useMemo(
    () =>
      computePlayerStats(
        pairings,
        sessionPlayers.map((sp) => sp.users?.id).filter((id): id is string => id !== null)
      ),
    [pairings, sessionPlayers]
  );

  const activePlayers = useMemo(
    () => sessionPlayers.filter((sp) => sp.is_active && sp.users).map((sp) => sp.users!),
    [sessionPlayers]
  );

  const availablePlayers = useMemo(
    () => activePlayers.filter((p) => !busyIds.has(p.id)),
    [activePlayers, busyIds]
  );

  const sortedStats = useMemo(() => {
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

    const dir = statsSortDir === "asc" ? 1 : -1;
    return rows.toSorted((a, b) => {
      switch (statsSortCol) {
        case "name":
          return dir * a.user.display_name.localeCompare(b.user.display_name);
        case "active":
          return dir * ((a.sp.is_active ? 1 : 0) - (b.sp.is_active ? 1 : 0));
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
  }, [sessionPlayers, statsMap, statsSortCol, statsSortDir]);

  const playersWithStats = useMemo(
    () =>
      availablePlayers.map((p) => ({
        ...p,
        matchesPlayed: statsMap.get(p.id)?.matchesPlayed ?? 0,
        gamesSinceLastPlayed: statsMap.get(p.id)?.gamesSinceLastPlayed ?? 0,
      })),
    [availablePlayers, statsMap]
  );

  const getCourtPairing = (courtNumber: number) =>
    pairings.find((p) => p.court_number === courtNumber && p.status === "in_progress");

  const getPlayerById = (id: string) =>
    sessionPlayers.find((sp) => sp.users?.id === id)?.users ?? null;

  const handleCourtClick = (courtNumber: number) => {
    if (isCompleted) return;
    const existing = getCourtPairing(courtNumber);
    if (existing) {
      setResultModal({ pairingId: existing.id, courtNumber });
      return;
    }

    // opt-1: Open modal instantly, load AI suggestion in the background
    setAssignModal({ courtNumber, suggestionLoading: true });
    fetch(`/api/sessions/${session.id}/pairings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generate: true, court_number: courtNumber }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAssignModal((prev) =>
          prev?.courtNumber === courtNumber
            ? { ...prev, suggestion: data?.suggestion, suggestionLoading: false }
            : prev
        );
      })
      .catch(() => {
        setAssignModal((prev) =>
          prev?.courtNumber === courtNumber ? { ...prev, suggestionLoading: false } : prev
        );
      });
  };

  const handleConfirmAssignment = async (assignment: {
    teamA: [string, string];
    teamB: [string, string];
  }) => {
    if (isCompleted) return;
    if (!assignModal) return;

    // opt-2: Close modal and add a temporary pairing immediately
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const tempPairing: Pairing = {
      id: tempId,
      session_id: session.id,
      court_number: assignModal.courtNumber,
      team_a_player_1: assignment.teamA[0],
      team_a_player_2: assignment.teamA[1],
      team_b_player_1: assignment.teamB[0],
      team_b_player_2: assignment.teamB[1],
      status: "in_progress",
      sequence_number: Math.max(0, ...pairings.map((p) => p.sequence_number)) + 1,
      created_at: now,
      completed_at: null,
      game_results: null,
    };
    setPairings((prev) => [...prev, tempPairing]);
    setAssignModal(null);

    // opt-5: Optimistically activate session if it's still draft
    if (sessionStatus === "draft") {
      setSessionStatus("active");
      const statusRes = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (statusRes.ok) router.refresh();
    }

    const res = await fetch(`/api/sessions/${session.id}/pairings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        court_number: assignModal.courtNumber,
        team_a_player_1: assignment.teamA[0],
        team_a_player_2: assignment.teamA[1],
        team_b_player_1: assignment.teamB[0],
        team_b_player_2: assignment.teamB[1],
      }),
    });

    if (res.ok) {
      const newPairing = await res.json();
      // Replace temp entry with the real one from the server
      setPairings((prev) =>
        prev.map((p) => (p.id === tempId ? { ...newPairing, game_results: null } : p))
      );
    } else {
      // Rollback on failure
      setPairings((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  const handleRecordResult = async (result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "team_a" | "team_b";
  }) => {
    if (isCompleted) return;
    if (!resultModal) return;
    const { pairingId } = resultModal;

    // opt-3: Update state immediately, persist in background
    const now = new Date().toISOString();
    setPairings((prev) =>
      prev.map((p) =>
        p.id === pairingId ? { ...p, status: "completed", completed_at: now } : p
      )
    );
    setResultModal(null);

    const res = await fetch(`/api/sessions/${session.id}/pairings/${pairingId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (!res.ok) {
      // Rollback on failure
      setPairings((prev) =>
        prev.map((p) =>
          p.id === pairingId ? { ...p, status: "in_progress", completed_at: null } : p
        )
      );
    }
  };

  const handleVoidGame = async () => {
    if (isCompleted) return;
    if (!resultModal) return;
    const { pairingId } = resultModal;

    // opt-3: Update state immediately, persist in background
    const now = new Date().toISOString();
    setPairings((prev) =>
      prev.map((p) =>
        p.id === pairingId ? { ...p, status: "voided", completed_at: now } : p
      )
    );
    setResultModal(null);

    const res = await fetch(`/api/sessions/${session.id}/pairings/${pairingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "voided" }),
    });

    if (!res.ok) {
      // Rollback on failure
      setPairings((prev) =>
        prev.map((p) =>
          p.id === pairingId ? { ...p, status: "in_progress", completed_at: null } : p
        )
      );
    }
  };

  const handleToggleActive = async (spId: string, currentActive: boolean) => {
    if (isCompleted) return;
    // opt-4: Flip immediately, rollback on failure
    setSessionPlayers((prev) =>
      prev.map((sp) => (sp.id === spId ? { ...sp, is_active: !currentActive } : sp))
    );

    const res = await fetch(`/api/sessions/${session.id}/players/${spId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });

    if (!res.ok) {
      // Rollback on failure
      setSessionPlayers((prev) =>
        prev.map((sp) => (sp.id === spId ? { ...sp, is_active: currentActive } : sp))
      );
    }
  };

  const handleAddCourt = async () => {
    if (isCompleted) return;
    setNumCourts((n) => n + 1);
    const res = await fetch(`/api/sessions/${session.id}/courts`, { method: "POST" });
    if (!res.ok) setNumCourts((n) => n - 1);
  };

  const handleRemoveCourt = async (courtNumber: number) => {
    if (isCompleted) return;
    setNumCourts((n) => n - 1);
    const res = await fetch(`/api/sessions/${session.id}/courts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: courtNumber }),
    });
    if (!res.ok) {
      setNumCourts((n) => n + 1);
    }
  };

  const handleSaveCourtName = async (courtNumber: number, name: string) => {
    if (isCompleted) return;
    const trimmed = name.trim();
    const updated = { ...courtNames };
    if (trimmed) updated[String(courtNumber)] = trimmed;
    else delete updated[String(courtNumber)];
    setCourtNames(updated);
    setRenamingCourt(null);
    fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_names: updated }),
    });
  };

  const handleRemovePlayer = (spId: string) => {
    if (isCompleted) return;
    const original = sessionPlayers.find((sp) => sp.id === spId);
    setSessionPlayers((prev) => prev.filter((sp) => sp.id !== spId));
    fetch(`/api/sessions/${session.id}/players/${spId}`, { method: "DELETE" }).then((res) => {
      if (!res.ok && original) {
        setSessionPlayers((prev) => [...prev, original]);
      }
    });
  };

  const handleStatusChange = async (newStatus: SessionStatus) => {
    const prev = sessionStatus;
    setSessionStatus(newStatus);
    setStatusSaving(true);
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    if (!res.ok) {
      setSessionStatus(prev);
    } else {
      router.refresh();
    }
  };

  const alreadyInSessionIds = useMemo(
    () => new Set(sessionPlayers.map((sp) => sp.users?.id).filter(Boolean)),
    [sessionPlayers]
  );

  const searchedUsers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return allUsers
      .filter((u) => !alreadyInSessionIds.has(u.id))
      .filter((u) => !q || u.display_name.toLowerCase().includes(q));
  }, [allUsers, alreadyInSessionIds, playerSearch]);

  const toggleSelectExistingUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddSelectedExisting = () => {
    if (isCompleted || selectedUserIds.length === 0) return;
    startAddingPlayer(async () => {
      for (const userId of selectedUserIds) {
        const res = await fetch(`/api/sessions/${session.id}/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) {
          const sp = await res.json();
          setSessionPlayers((prev) =>
            prev.some((p) => p.id === sp.id) ? prev : [...prev, sp]
          );
        }
      }
      setSelectedUserIds([]);
      setPlayerSearch("");
      setShowNewForm(false);
      setAddingPlayer(false);
    });
  };

  const handleAddNewPlayer = (e: React.FormEvent) => {
    if (isCompleted) return;
    e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;

    const isDupe = allUsers.some(
      (u) => u.display_name.trim().toLowerCase() === name.toLowerCase()
    );
    if (isDupe) {
      setNewPlayerError("A player with that name already exists.");
      return;
    }
    setNewPlayerError("");

    startAddingPlayer(async () => {
      const res = await fetch(`/api/sessions/${session.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newPlayerName, skill_level: newPlayerSkill }),
      });
      if (res.ok) {
        const sp = await res.json();
        setSessionPlayers((prev) =>
          prev.some((p) => p.id === sp.id) ? prev : [...prev, sp]
        );
        setNewPlayerName("");
        setNewPlayerSkill(5);
        setShowNewForm(false);
      }
    });
  };

  const courts = Array.from({ length: numCourts }, (_, i) => i + 1);

  const resultPairing = resultModal
    ? pairings.find((p) => p.id === resultModal.pairingId)
    : null;

  const completedPairings = pairings.filter((p) => p.status === "completed");
  const avgAvailSkill =
    availablePlayers.length > 0
      ? (availablePlayers.reduce((s, p) => s + p.skill_level, 0) / availablePlayers.length).toFixed(1)
      : "–";

  return (
    <>
      {sessionUpdatedToast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800"
        >
          Session updated by another user
        </div>
      )}
      {/* Tabs */}
      <div className="mb-4 flex border-b">
        {(["game", "stats", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-green-600 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "game" ? "Game" : tab === "stats" ? "Stats" : "Settings"}
          </button>
        ))}
      </div>

      {activeTab === "game" && (
        <>
          {/* Courts grid */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courts.map((courtNumber) => {
              const pairing = getCourtPairing(courtNumber);
              // Temp pairings have not been confirmed by the server yet — block interaction
              const isPending = pairing?.id.startsWith("temp-");
              const teamA = pairing
                ? ([getPlayerById(pairing.team_a_player_1), getPlayerById(pairing.team_a_player_2)] as [
                    ReturnType<typeof getPlayerById>,
                    ReturnType<typeof getPlayerById>
                  ])
                : undefined;
              const teamB = pairing
                ? ([getPlayerById(pairing.team_b_player_1), getPlayerById(pairing.team_b_player_2)] as [
                    ReturnType<typeof getPlayerById>,
                    ReturnType<typeof getPlayerById>
                  ])
                : undefined;

              const isLastCourt = courtNumber === numCourts;
              const canRemove = !pairing && isLastCourt && numCourts > 1;
              const courtLabel = courtNames[String(courtNumber)];

              return (
                <div key={courtNumber} className="group relative">
                  <CourtCard
                    courtNumber={courtNumber}
                    courtLabel={courtLabel}
                    teamA={
                      teamA && teamA[0] && teamA[1]
                        ? (teamA as [NonNullable<typeof teamA[0]>, NonNullable<typeof teamA[1]>])
                        : undefined
                    }
                    teamB={
                      teamB && teamB[0] && teamB[1]
                        ? (teamB as [NonNullable<typeof teamB[0]>, NonNullable<typeof teamB[1]>])
                        : undefined
                    }
                    status={pairing ? "in_progress" : "available"}
                    isPending={isPending}
                    isRenaming={renamingCourt === courtNumber}
                    renameValue={renamingCourt === courtNumber ? renameValue : ""}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={() => handleSaveCourtName(courtNumber, renameValue)}
                    onRenameCancel={() => setRenamingCourt(null)}
                    onRenameStart={() => {
                      setRenamingCourt(courtNumber);
                      setRenameValue(courtLabel ?? "");
                    }}
                    onRemove={!isCompleted && canRemove ? () => handleRemoveCourt(courtNumber) : undefined}
                    onClick={
                      isPending || renamingCourt === courtNumber || isCompleted
                        ? undefined
                        : () => handleCourtClick(courtNumber)
                    }
                  />
                </div>
              );
            })}

            {/* Add court button */}
            {!isCompleted && (
              <button
                onClick={handleAddCourt}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500"
              >
                <span className="text-lg">+</span> Add Court
              </button>
            )}
          </div>

          {/* Available players */}
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Available Players ({availablePlayers.length})
                </h3>
                {availablePlayers.length > 0 && (
                  <p className="text-xs text-gray-400">Avg skill: {avgAvailSkill}</p>
                )}
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-400">{completedPairings.length} games played</span>
                {!isCompleted && (
                  <button
                    onClick={() => setAddingPlayer(!addingPlayer)}
                    className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    + Add Player
                  </button>
                )}
              </div>
            </div>

            {addingPlayer && (
              <div className="mb-3 rounded-lg border bg-gray-50 p-3">
                {/* Search existing players */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Search players…"
                    autoFocus
                    className="w-full rounded border px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  />
                </div>

                {/* Existing player list */}
                {searchedUsers.length > 0 && (
                  <ul className="mb-2 max-h-48 overflow-y-auto divide-y rounded border bg-white">
                    {searchedUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            disabled={isAddingPlayer}
                            onClick={() => toggleSelectExistingUser(u.id)}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-green-50 disabled:opacity-60",
                              isSelected && "bg-green-50 ring-1 ring-green-400"
                            )}
                          >
                            {u.picture_url ? (
                              <img
                                src={u.picture_url}
                                alt=""
                                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500"
                                aria-hidden
                              >
                                {(u.display_name ?? "?").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
                              {u.display_name}
                            </span>
                            <span className="ml-2 flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Skill {u.skill_level}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {searchedUsers.length === 0 && playerSearch && !showNewForm && (
                  <p className="mb-2 text-xs text-gray-400">No matching players found.</p>
                )}

                {/* Create new name-slot player */}
                {!showNewForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewForm(true)}
                    className="text-xs text-green-700 hover:underline"
                  >
                    + Create new player (name slot)
                  </button>
                ) : (
                  <form onSubmit={handleAddNewPlayer} className="flex flex-wrap items-end gap-2 pt-1">
                    <div className="min-w-0 flex-1" style={{ minWidth: "120px" }}>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => { setNewPlayerName(e.target.value); setNewPlayerError(""); }}
                        placeholder="Player name"
                        autoFocus
                        className="w-full rounded border px-2 py-2 text-sm focus:border-green-400 focus:outline-none"
                      />
                      {newPlayerError && (
                        <p className="mt-1 text-xs text-red-600">{newPlayerError}</p>
                      )}
                    </div>
                    <div className="w-20 flex-shrink-0">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Skill (1–10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={newPlayerSkill}
                        onChange={(e) => setNewPlayerSkill(parseInt(e.target.value))}
                        className="w-full rounded border px-2 py-2 text-sm focus:border-green-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isAddingPlayer}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {isAddingPlayer ? "Adding…" : "Add"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewForm(false)}
                        className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingPlayer(false);
                      setPlayerSearch("");
                      setShowNewForm(false);
                      setSelectedUserIds([]);
                    }}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedExisting}
                    disabled={isAddingPlayer || selectedUserIds.length === 0}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {isAddingPlayer
                      ? "Adding…"
                      : selectedUserIds.length > 0
                      ? `Add (${selectedUserIds.length})`
                      : "Add"}
                  </button>
                </div>
              </div>
            )}

            {/* All players list */}
            <div className="space-y-1.5">
              {sessionPlayers
                .filter((sp) => sp.users)
                // quality-4: .toSorted() is non-mutating
                .toSorted((a, b) => {
                  const busyA = busyIds.has(a.users!.id);
                  const busyB = busyIds.has(b.users!.id);
                  if (busyA !== busyB) return busyA ? 1 : -1;
                  const sa = statsMap.get(a.users!.id);
                  const sb = statsMap.get(b.users!.id);
                  return (sb?.gamesSinceLastPlayed ?? 0) - (sa?.gamesSinceLastPlayed ?? 0);
                })
                .map((sp) => {
                  const stats = statsMap.get(sp.users!.id);
                  const isBusy = busyIds.has(sp.users!.id);
                  const handleRowClick = () => {
                    if (isBusy) return;
                    handleToggleActive(sp.id, sp.is_active);
                  };

                  return (
                    <div
                      key={sp.id}
                      onClick={isCompleted ? undefined : handleRowClick}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors",
                        isBusy
                          ? "cursor-default bg-blue-50 border-blue-200"
                          : "cursor-pointer",
                        !isBusy &&
                          (sp.is_active
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-100")
                      )}
                    >
                      <PlayerBadge
                        name={sp.users!.display_name}
                        skillLevel={sp.users!.skill_level}
                        pictureUrl={sp.users!.picture_url}
                        matchesPlayed={stats?.matchesPlayed}
                        gamesSinceLastPlayed={stats?.gamesSinceLastPlayed}
                        isActive={sp.is_active}
                        isLinked={!!sp.users!.line_user_id}
                        showSkillLevelPill={showSkillLevelPills}
                        className="flex-1"
                      />
                      {!isBusy && !isCompleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Remove ${sp.users!.display_name} from this session?`)) return;
                            handleRemovePlayer(sp.id);
                          }}
                          aria-label={`Remove ${sp.users!.display_name} from session`}
                          className="flex h-8 flex-shrink-0 items-center rounded-lg px-2.5 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                          title="Remove from session"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              {sessionPlayers.length === 0 && (
                <p className="py-3 text-center text-sm text-gray-400">
                  No players yet. Click &quot;+ Add Player&quot; to get started.
                </p>
              )}
          </div>
        </div>

        </>
      )}

      {activeTab === "stats" && (
        <div className="rounded-xl border bg-white">
          {/* Sort pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
            <span className="mr-1 text-xs text-gray-400">Sort:</span>
            {(
              [
                { col: "name" as const, label: "Name" },
                { col: "played" as const, label: "Played" },
                { col: "wins" as const, label: "W" },
                { col: "losses" as const, label: "L" },
                { col: "winPct" as const, label: "Win%" },
                { col: "sat" as const, label: "Sat" },
                { col: "skill" as const, label: "Skill" },
                { col: "active" as const, label: "Active" },
              ] as const
            ).map(({ col, label }) => (
              <button
                key={col}
                onClick={() => handleStatsSort(col)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  statsSortCol === col
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {label}
                {statsSortCol === col && (
                  <span className="ml-0.5">{statsSortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Player rows */}
          <div className="divide-y">
            {sortedStats.map(({ sp, user, matchesPlayed, wins, losses, winPct, gamesSince }) => (
              <div
                key={sp.id}
                className={cn("flex items-center gap-3 px-4 py-3", !sp.is_active && "opacity-50")}
              >
                <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
                  {user.picture_url ? (
                    <img
                      src={user.picture_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500"
                      aria-hidden
                    >
                      {(user.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {!sp.is_active && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                      zzz
                    </span>
                  )}
                </div>
                {/* Skill colour bar */}
                <div className={cn("h-10 w-1.5 flex-shrink-0 rounded-full", getSkillColor(user.skill_level))} />

                {/* Name + inline stats */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{user.display_name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                    <span className="text-xs text-gray-400">
                      {matchesPlayed} played
                    </span>
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
                    <span
                      className={cn(
                        "text-xs",
                        gamesSince >= 3 ? "font-semibold text-amber-600" : "text-gray-400"
                      )}
                    >
                      ⏱ {gamesSince}
                    </span>
                    <span className="text-xs text-gray-400">S{user.skill_level}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          {/* Session status */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Session Status</h3>
            <p className="mb-2 text-xs text-gray-400">
              Control the current lifecycle state of this session.
            </p>
            <div
              className={cn(
                "flex rounded-lg border border-gray-200 overflow-hidden",
                statusSaving && "opacity-60 pointer-events-none"
              )}
            >
              {(["draft", "active", "completed"] as const).map((s, idx) => {
                const isSelected = sessionStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={statusSaving || isSelected}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      "flex-1 min-w-0 px-2 py-2 text-xs font-medium text-center capitalize transition-colors disabled:cursor-not-allowed",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500",
                      idx > 0 && "border-l border-gray-200",
                      isSelected
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {statusSaving && (
              <p className="mt-1.5 text-xs text-gray-400">Saving…</p>
            )}
          </div>

          {/* Player permissions */}
          <PlayerPermissionsPanel
            sessionId={session.id}
            initialPermissions={{
              allow_player_assign_empty_court: session.allow_player_assign_empty_court,
              allow_player_record_own_result: session.allow_player_record_own_result,
              allow_player_record_any_result: session.allow_player_record_any_result,
              allow_player_add_remove_courts: session.allow_player_add_remove_courts,
              allow_player_access_invite_qr: session.allow_player_access_invite_qr,
            }}
          />

          {/* Display: show skill level pills in Available Players list */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Display</h3>
            <p className="mb-2 text-xs text-gray-400">
              Show skill level in the Available Players list on the Game tab.
            </p>
            <div
              className={cn(
                "flex rounded-lg border border-gray-200 overflow-hidden",
                showSkillLevelPillsSaving && "opacity-60 pointer-events-none"
              )}
            >
              {(["Hide", "Show"] as const).map((label, idx) => {
                const value = label === "Show";
                const isSelected =
                  (value && showSkillLevelPills) || (!value && !showSkillLevelPills);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={showSkillLevelPillsSaving || isSelected}
                    onClick={async () => {
                      if (showSkillLevelPills === value) return;
                      setShowSkillLevelPills(value);
                      setShowSkillLevelPillsSaving(true);
                      const res = await fetch(`/api/sessions/${session.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ show_skill_level_pills: value }),
                      });
                      setShowSkillLevelPillsSaving(false);
                      if (!res.ok) setShowSkillLevelPills((prev) => !prev);
                    }}
                    className={cn(
                      "flex-1 min-w-0 px-2 py-2 text-xs font-medium text-center transition-colors disabled:cursor-not-allowed",
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
            {showSkillLevelPillsSaving && (
              <p className="mt-1.5 text-xs text-gray-400">Saving…</p>
            )}
          </div>
        </div>
      )}

      {/* Assignment Modal — open prop removed; rendered only when assignModal is set */}
      {assignModal && (
        <AssignmentModal
          courtNumber={assignModal.courtNumber}
          sessionId={session.id}
          availablePlayers={playersWithStats}
          suggestion={assignModal.suggestion}
          suggestionLoading={assignModal.suggestionLoading}
          onClose={() => setAssignModal(null)}
          onConfirm={handleConfirmAssignment}
        />
      )}

      {/* Result Modal — open prop removed; rendered only when resultModal is set */}
      {resultModal && resultPairing && (
        <ResultModal
          pairingId={resultModal.pairingId}
          sessionId={session.id}
          teamA={[
            getPlayerById(resultPairing.team_a_player_1)!,
            getPlayerById(resultPairing.team_a_player_2)!,
          ]}
          teamB={[
            getPlayerById(resultPairing.team_b_player_1)!,
            getPlayerById(resultPairing.team_b_player_2)!,
          ]}
          onClose={() => setResultModal(null)}
          onConfirm={handleRecordResult}
          onVoid={handleVoidGame}
        />
      )}
    </>
  );
}
