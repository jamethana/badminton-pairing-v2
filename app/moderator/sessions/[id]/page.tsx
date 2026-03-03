import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import CourtDashboardClient from "./court-dashboard-client";

export default async function SessionDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionRes, playersRes, pairingsRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).single(),
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
  const sessionPlayers = playersRes.data ?? [];
  const pairings = pairingsRes.data ?? [];

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
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            session.status === "active"
              ? "bg-green-100 text-green-700"
              : session.status === "completed"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {session.status}
        </span>
      </div>

      <CourtDashboardClient
        session={session}
        initialSessionPlayers={sessionPlayers}
        initialPairings={pairings}
      />
    </div>
  );
}
