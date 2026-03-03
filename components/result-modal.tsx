"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  display_name: string;
  skill_level: number;
}

interface ResultModalProps {
  open: boolean;
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
  open,
  teamA,
  teamB,
  onClose,
  onConfirm,
  onVoid,
}: ResultModalProps) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [loading, setLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);

  if (!open) return null;

  const numA = parseInt(scoreA) || 0;
  const numB = parseInt(scoreB) || 0;
  const canSubmit = scoreA !== "" && scoreB !== "" && numA !== numB;
  const winner = numA > numB ? "team_a" : numB > numA ? "team_b" : null;

  const handleSubmit = async () => {
    if (!canSubmit || !winner) return;
    setLoading(true);
    try {
      await onConfirm({
        team_a_score: numA,
        team_b_score: numB,
        winner_team: winner,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!onVoid) return;
    setVoidLoading(true);
    try {
      await onVoid();
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Record Result</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          {([{ team: teamA, label: "Team A", key: "A" }, { team: teamB, label: "Team B", key: "B" }] as const).map(
            ({ team, label, key }) => (
              <div
                key={key}
                className={cn(
                  "rounded-xl border p-3",
                  winner === (key === "A" ? "team_a" : "team_b") && "border-green-400 bg-green-50"
                )}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="text-sm">{team[0].display_name}</p>
                <p className="text-sm">{team[1].display_name}</p>
                <div className="mt-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    placeholder="Score"
                    value={key === "A" ? scoreA : scoreB}
                    onChange={(e) =>
                      key === "A" ? setScoreA(e.target.value) : setScoreB(e.target.value)
                    }
                    className="text-center text-lg font-bold"
                  />
                </div>
                {winner === (key === "A" ? "team_a" : "team_b") && (
                  <p className="mt-1 text-center text-xs font-semibold text-green-600">Winner!</p>
                )}
              </div>
            )
          )}
        </div>

        {numA === numB && scoreA !== "" && scoreB !== "" && (
          <p className="mb-2 text-center text-xs text-red-500">Scores cannot be equal — there must be a winner.</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="mb-2 w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? "Saving..." : "Save Result"}
        </Button>

        {onVoid && (
          <Button
            variant="outline"
            onClick={handleVoid}
            disabled={voidLoading}
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            {voidLoading ? "Voiding..." : "Void Game"}
          </Button>
        )}
      </div>
    </div>
  );
}
