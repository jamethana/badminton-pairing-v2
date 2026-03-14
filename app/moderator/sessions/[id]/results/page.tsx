import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import ReopenSessionButton from "@/components/reopen-session-button";
import SessionResultsClient from "./results-client";

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionRes, pairingsRes, playersRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("pairings")
      .select(`*, game_results(*)`)
      .eq("session_id", id)
      .eq("status", "completed")
      .order("sequence_number", { ascending: false }),
    supabase
      .from("session_players")
      .select(`id, is_active, users(id, display_name, skill_level, picture_url, skill_level, calculated_skill_rating, is_moderator, created_at, updated_at, line_user_id, auth_secret, trueskill_mu, trueskill_sigma, trueskill_updated_at)`)
      .eq("session_id", id),
  ]);

  if (!sessionRes.data) notFound();

  const session = sessionRes.data;
  const pairings = pairingsRes.data ?? [];
  const sessionPlayers = (playersRes.data ?? []).map((sp) => ({
    ...sp,
    users: sp.users as (typeof sp.users & { id: string }) | null,
  }));

  const playerMap = new Map(
    sessionPlayers
      .map((sp) => sp.users)
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <Link
          href={`/moderator/sessions/${id}`}
          className="mt-0.5 shrink-0 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(session.date + "T00:00:00"), "EEE, MMM d, yyyy")}
            {session.location && ` · ${session.location}`}
            {" · "}
            {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
          </p>
        </div>
        {session.status === "completed" && (
          <ReopenSessionButton sessionId={session.id} />
        )}
      </div>

      <SessionResultsClient
        pairings={pairings}
        sessionPlayers={sessionPlayers}
        playerMap={Object.fromEntries(playerMap)}
      />
    </div>
  );
}
