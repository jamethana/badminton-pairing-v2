import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import SessionEditDialog from "@/components/session-edit-dialog";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
};

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <Link
          href="/moderator/sessions/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          + New Session
        </Link>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="divide-y">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
              >
                <Link
                  href={`/moderator/sessions/${session.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="font-semibold text-gray-900">{session.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {format(new Date(session.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                    {" · "}
                    {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                    {session.location && ` · ${session.location}`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {session.num_courts} courts · max {session.max_players} players
                  </p>
                </Link>
                <Badge className={STATUS_STYLES[session.status]}>
                  {session.status}
                </Badge>
                <SessionEditDialog
                  id={session.id}
                  name={session.name}
                  date={session.date}
                  start_time={session.start_time}
                  end_time={session.end_time}
                  location={session.location}
                  num_courts={session.num_courts}
                  max_players={session.max_players}
                  status={session.status}
                  notes={session.notes}
                />
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              No sessions yet.{" "}
              <Link href="/moderator/sessions/new" className="text-green-600 hover:underline">
                Create your first session
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
