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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Players</h1>
      <PlayersClient initialPlayers={players ?? []} />
    </div>
  );
}
