import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import SessionEditDialog from "@/components/session-edit-dialog";
import SessionsFilters, { type SessionCreator } from "@/components/sessions-filters";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const createdBy = typeof params.created_by === "string" ? params.created_by.trim() : "";
  const status = typeof params.status === "string" ? params.status.trim() : "";
  const name = typeof params.name === "string" ? params.name.trim() : "";
  const location = typeof params.location === "string" ? params.location.trim() : "";

  const supabase = await createClient();

  // Fetch distinct creators: get all non-null created_by IDs present in sessions,
  // then resolve their display names for the filter dropdown.
  const { data: sessionCreatorRows } = await supabase
    .from("sessions")
    .select("created_by")
    .not("created_by", "is", null);

  const uniqueCreatorIds = [
    ...new Set(
      (sessionCreatorRows ?? [])
        .map((r) => r.created_by)
        .filter((id): id is string => id !== null)
    ),
  ];

  let creators: SessionCreator[] = [];
  if (uniqueCreatorIds.length > 0) {
    const { data: creatorUsers } = await supabase
      .from("users")
      .select("id, display_name")
      .in("id", uniqueCreatorIds)
      .order("display_name");
    creators = (creatorUsers ?? []).map((u) => ({
      id: u.id,
      display_name: u.display_name,
    }));
  }

  // Build filtered sessions query
  let query = supabase.from("sessions").select("*").order("date", { ascending: false });

  if (createdBy) {
    query = query.eq("created_by", createdBy);
  }
  if (status && (status === "draft" || status === "active" || status === "completed")) {
    query = query.eq("status", status);
  }
  if (name) {
    query = query.ilike("name", `%${name}%`);
  }
  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  const { data: sessions } = await query;

  const hasFilters = !!(createdBy || status || name || location);

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

      <SessionsFilters
        creators={creators}
        initialCreatedBy={createdBy}
        initialStatus={status}
        initialName={name}
        initialLocation={location}
      />

      <div className="rounded-xl border bg-white">
        <div className="divide-y">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
              >
                <Link
                  href={session.status === "completed" ? `/moderator/sessions/${session.id}/results` : `/moderator/sessions/${session.id}`}
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
                {session.status !== "completed" && (
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
                    allow_player_assign_empty_court={session.allow_player_assign_empty_court}
                    allow_player_record_own_result={session.allow_player_record_own_result}
                    allow_player_record_any_result={session.allow_player_record_any_result}
                    show_skill_level_pills={session.show_skill_level_pills}
                    allow_player_add_remove_courts={session.allow_player_add_remove_courts}
                    allow_player_access_invite_qr={session.allow_player_access_invite_qr}
                  />
                )}
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              {hasFilters ? (
                <>
                  No sessions match your filters.{" "}
                  <Link href="/moderator/sessions" className="text-green-600 hover:underline">
                    Clear filters
                  </Link>{" "}
                  to see all sessions.
                </>
              ) : (
                <>
                  No sessions yet.{" "}
                  <Link href="/moderator/sessions/new" className="text-green-600 hover:underline">
                    Create your first session
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
