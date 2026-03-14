"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type SessionRow = {
  id: string;
  status: string;
  num_courts: number;
  court_names: Record<string, string>;
  allow_player_assign_empty_court: boolean;
  allow_player_record_own_result: boolean;
  allow_player_record_any_result: boolean;
  show_skill_level_pills: boolean;
  allow_player_add_remove_courts: boolean;
  allow_player_access_invite_qr: boolean;
};

type SessionPlayerRow = {
  id: string;
  session_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
};

type PairingRow = {
  id: string;
  session_id: string;
  court_number: number;
  sequence_number: number;
  status: string;
  team_a_player_1: string | null;
  team_a_player_2: string | null;
  team_b_player_1: string | null;
  team_b_player_2: string | null;
  created_at: string;
  completed_at: string | null;
};

type GameResultRow = {
  id: string;
  pairing_id: string;
  team_a_score: number;
  team_b_score: number;
  winner_team: string;
  recorded_by: string | null;
  recorded_at: string;
};

export interface UseSessionRealtimeCallbacks {
  onSession?: (payload: SessionRow) => void;
  onSessionPlayers?: (op: "INSERT" | "UPDATE" | "DELETE", payload: SessionPlayerRow) => void;
  onPairings?: (op: "INSERT" | "UPDATE" | "DELETE", payload: PairingRow) => void;
  onGameResults?: (op: "INSERT" | "UPDATE" | "DELETE", payload: GameResultRow) => void;
  onRemoteUpdate?: () => void;
  /**
   * Called when the channel becomes SUBSCRIBED (initial or after reconnect) and when the tab becomes visible again.
   * @param isResubscribe - false on first subscribe (RSC already sent data; skip refetch). true on reconnect or visibility change (refetch to sync).
   */
  onSubscribed?: (isResubscribe: boolean) => void;
}

/**
 * Subscribes to Supabase Realtime for a session's tables so multiple
 * moderators/players stay in sync when operating the same session.
 */
export function useSessionRealtime(
  sessionId: string | null,
  callbacks: UseSessionRealtimeCallbacks
): void {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channelName = `session:${sessionId}`;
    let channel: RealtimeChannel | null = null;
    let hasSubscribedRef = false;

    const notifyRemote = () => {
      callbacksRef.current.onRemoteUpdate?.();
    };

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            callbacksRef.current.onSession?.(payload.new as SessionRow);
            notifyRemote();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const op = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (op === "DELETE" ? payload.old : payload.new) as SessionPlayerRow;
          if (row) {
            callbacksRef.current.onSessionPlayers?.(op, row);
            notifyRemote();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pairings",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const op = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (op === "DELETE" ? payload.old : payload.new) as PairingRow;
          if (row && !row.id.startsWith("temp-")) {
            callbacksRef.current.onPairings?.(op, row);
            notifyRemote();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_results",
        },
        (payload) => {
          const op = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (op === "DELETE" ? payload.old : payload.new) as GameResultRow;
          if (row) {
            callbacksRef.current.onGameResults?.(op, row);
            notifyRemote();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const isResubscribe = hasSubscribedRef;
          hasSubscribedRef = true;
          callbacksRef.current.onSubscribed?.(isResubscribe);
        }
      });

    const triggerOnSubscribed = () => {
      callbacksRef.current.onSubscribed?.(true);
    };

    let visibilityTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (visibilityTimeoutId !== null) clearTimeout(visibilityTimeoutId);
      visibilityTimeoutId = setTimeout(() => {
        visibilityTimeoutId = null;
        triggerOnSubscribed();
      }, 250);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutId !== null) clearTimeout(visibilityTimeoutId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId]);
}
