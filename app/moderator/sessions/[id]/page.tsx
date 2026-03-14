import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import CourtDashboardClient from "./court-dashboard-client";
import SessionInviteActions from "@/components/session-invite-actions";

export default async function SessionDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionRes, playersRes, pairingsRes, allUsersRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("session_players")
      .select(`*, users(*)`)
      .eq("session_id", id),
    supabase
      .from("pairings")
      .select(`*, game_results(*)`)
      .eq("session_id", id)
      .order("sequence_number", { ascending: true }),
    supabase
      .from("users")
      .select("id, display_name, picture_url, skill_level, line_user_id")
      .order("display_name"),
  ]);

  if (!sessionRes.data) notFound();

  const session = sessionRes.data;

  if (session.status === "completed") {
    redirect(`/moderator/sessions/${id}/results`);
  }
  const sessionPlayers = playersRes.data ?? [];
  const pairings = pairingsRes.data ?? [];
  const allUsers = allUsersRes.data ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(session.date + "T00:00:00"), "EEE, MMM d")}
            {session.location && ` · ${session.location}`}
            {" · "}
            {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              session.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {session.status}
          </span>
          <SessionInviteActions sessionId={session.id} />
        </div>
      </div>

      <CourtDashboardClient
        session={{
          id: session.id,
          status: session.status,
          num_courts: session.num_courts,
          court_names: session.court_names,
          allow_player_assign_empty_court: session.allow_player_assign_empty_court,
          allow_player_record_own_result: session.allow_player_record_own_result,
          allow_player_record_any_result: session.allow_player_record_any_result,
          show_skill_level_pills: session.show_skill_level_pills ?? true,
          allow_player_add_remove_courts: session.allow_player_add_remove_courts,
          allow_player_access_invite_qr: session.allow_player_access_invite_qr,
          pairing_rule: session.pairing_rule,
          max_partner_skill_level_gap: session.max_partner_skill_level_gap,
        }}
        initialSessionPlayers={sessionPlayers}
        initialPairings={pairings}
        allUsers={allUsers}
      />
    </div>
  );
}
