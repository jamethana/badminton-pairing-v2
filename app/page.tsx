import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/nav-bar";
import { getViewAs } from "@/lib/view-as";
import UserSessionsList, { type UserSession } from "@/components/user-sessions-list";

export default async function Home() {
  const [user, viewAs] = await Promise.all([getCurrentUser(), getViewAs()]);

  if (!user) {
    redirect("/login");
  }

  // Moderators go to their dashboard unless they've switched to player view
  if (user.appUser.is_moderator && viewAs !== "player") {
    redirect("/moderator");
  }

  const supabase = await createClient();

  // Get sessions the player is part of
  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select(`sessions(*)`)
    .eq("user_id", user.appUser.id);

  const sessions: UserSession[] = (sessionPlayers ?? [])
    .map((sp) => sp.sessions)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        isModerator={user.appUser.is_moderator}
        displayName={user.appUser.display_name}
        pictureUrl={user.appUser.picture_url}
        viewAs={viewAs}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user.appUser.display_name}! 👋
          </h1>
          <p className="text-sm text-gray-500">
            DM Jame for bugs, feedback, or feature requests!
          </p>
        </div>

        {activeSessions.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-green-400 bg-green-50 p-4">
            <p className="mb-2 text-sm font-semibold text-green-800">Live Session</p>
            {activeSessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="block text-lg font-bold text-green-700 hover:underline"
              >
                {s.name} →
              </Link>
            ))}
          </div>
        )}

        <UserSessionsList sessions={sessions} />
      </main>
    </div>
  );
}
