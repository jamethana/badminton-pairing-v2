import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import NavBar from "@/components/nav-bar";
import SessionInviteActions from "@/components/session-invite-actions";
import PlayerSessionClient from "./player-session-client";
import { getViewAs } from "@/lib/view-as";

export default async function PlayerSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, viewAs] = await Promise.all([getCurrentUser(), getViewAs()]);
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [sessionRes, allPlayersRes, pairingsRes] = await Promise.all([
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
  ]);

  if (!sessionRes.data) notFound();

  const session = sessionRes.data;

  if (session.status === "completed") {
    redirect(`/sessions/${id}/results`);
  }

  const sessionPlayers = allPlayersRes.data ?? [];
  const pairings = pairingsRes.data ?? [];

  // Check if this user has a slot
  const mySlot = sessionPlayers.find((sp) => sp.user_id === user.appUser.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        isModerator={user.appUser.is_moderator}
        displayName={user.appUser.display_name}
        pictureUrl={user.appUser.picture_url}
        viewAs={viewAs}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">{session.name}</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(session.date + "T00:00:00"), "EEE, MMM d, yyyy")}
              {session.location && ` · ${session.location}`}
              {" · "}
              {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
            </p>
          </div>
          {(user.appUser.is_moderator || session.allow_player_access_invite_qr) && (
            <SessionInviteActions sessionId={session.id} />
          )}
        </div>

        {/* react-3: unclaimedSlots is now derived inside the client component */}
        <PlayerSessionClient
          session={session}
          sessionPlayers={sessionPlayers}
          pairings={pairings}
          currentUserId={user.appUser.id}
          mySlot={mySlot ?? null}
        />
      </main>
    </div>
  );
}
