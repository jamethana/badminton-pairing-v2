import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
};

export default async function ModeratorDashboard() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false })
    .limit(5);

  const { data: playerCount } = await supabase
    .from("users")
    .select("id", { count: "exact" });

  const activeSessions = sessions?.filter((s) => s.status === "active") ?? [];
  const upcomingSessions = sessions?.filter((s) => s.status === "draft") ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderator Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.appUser.display_name}</p>
        </div>
        <Link
          href="/moderator/sessions/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          + New Session
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Total Players</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{playerCount?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{activeSessions.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{upcomingSessions.length}</p>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-gray-800">Recent Sessions</h2>
          <Link href="/moderator/sessions" className="text-sm text-green-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/moderator/sessions/${session.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{session.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(session.date + "T00:00:00"), "EEE, MMM d")}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <Badge className={STATUS_STYLES[session.status]}>{session.status}</Badge>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No sessions yet.{" "}
              <Link href="/moderator/sessions/new" className="text-green-600 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
