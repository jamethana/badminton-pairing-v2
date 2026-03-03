import { createClient } from "@/lib/supabase/server";
import PlayersClient from "./players-client";

export default async function PlayersPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("users")
    .select("*")
    .order("display_name");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <p className="text-sm text-gray-500">{(players ?? []).length} total</p>
      </div>
      <PlayersClient initialPlayers={players ?? []} />
    </div>
  );
}
