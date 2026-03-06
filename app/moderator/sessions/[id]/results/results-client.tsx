"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import SessionResultsList from "@/components/session-results-list";
import SessionStatsTab from "@/components/session-stats-tab";
import type { Tables } from "@/types/database";
import type { PairingWithResult } from "@/lib/utils/session-stats";

type PlayerInfo = {
  id: string;
  display_name: string;
  skill_level: number;
};

type SessionPlayer = {
  id: string;
  is_active: boolean;
  users: Tables<"users"> | null;
};

interface ResultsClientProps {
  pairings: PairingWithResult[];
  sessionPlayers: SessionPlayer[];
  playerMap: Record<string, PlayerInfo>;
}

type ActiveTab = "results" | "stats";

export default function ResultsClient({
  pairings,
  sessionPlayers,
  playerMap,
}: ResultsClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("results");

  const getPlayer = (id: string) => playerMap[id];

  return (
    <>
      {/* Tabs */}
      <div className="mb-4 flex border-b">
        {(["results", "stats"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-green-600 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "results" ? `Results (${pairings.length})` : "Stats"}
          </button>
        ))}
      </div>

      {activeTab === "results" && (
        <SessionResultsList pairings={pairings} getPlayer={getPlayer} />
      )}

      {activeTab === "stats" && (
        <SessionStatsTab sessionPlayers={sessionPlayers} pairings={pairings} />
      )}
    </>
  );
}
