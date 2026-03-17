import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import NavBar from "@/components/nav-bar";
import { getViewAs } from "@/lib/view-as";
import SessionResultsClient from "./results-client";

export default async function PlayerSessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, viewAs] = await Promise.all([getCurrentUser(), getViewAs()]);
  if (!user) redirect("/login");

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
      .select(`id, is_active, users(*)`)
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
    <div className="min-h-screen bg-muted">
      <NavBar
        isModerator={user.appUser.is_moderator}
        displayName={user.appUser.display_name}
        pictureUrl={user.appUser.picture_url}
        viewAs={viewAs}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-foreground">{session.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.date + "T00:00:00"), "EEE, MMM d, yyyy")}
            {session.location && ` · ${session.location}`}
            {" · "}
            {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
          </p>
        </header>

        <section aria-label="Session results">
          <SessionResultsClient
            pairings={pairings}
            sessionPlayers={sessionPlayers}
            playerMap={Object.fromEntries(playerMap)}
          />
        </section>
      </main>
    </div>
  );
}
