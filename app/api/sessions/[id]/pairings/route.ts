import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePairing } from "@/lib/algorithms/pairing";

const CreatePairingSchema = z.object({
  court_number: z.number().int().min(1),
  team_a_player_1: z.string().uuid(),
  team_a_player_2: z.string().uuid(),
  team_b_player_1: z.string().uuid(),
  team_b_player_2: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("pairings")
    .select(`*, game_results(*)`)
    .eq("session_id", id)
    .order("sequence_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (body.generate) {
    // Auto-generate pairing for a court
    const courtNumber = body.court_number as number;

    const { data: sessionPlayers } = await supabase
      .from("session_players")
      .select(`users(*)`)
      .eq("session_id", id)
      .eq("is_active", true);

    const { data: pairings } = await supabase
      .from("pairings")
      .select("*")
      .eq("session_id", id);

    const activePlayers = (sessionPlayers ?? [])
      .map((sp) => sp.users)
      .filter((u): u is NonNullable<typeof u> => u !== null);

    const suggestion = generatePairing(activePlayers, pairings ?? [], courtNumber);
    if (!suggestion) {
      return NextResponse.json({ error: "Not enough available players" }, { status: 422 });
    }

    return NextResponse.json({ suggestion });
  }

  const parsed = CreatePairingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Get next sequence number
  const { data: lastPairing } = await supabase
    .from("pairings")
    .select("sequence_number")
    .eq("session_id", id)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sequenceNumber = (lastPairing?.sequence_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("pairings")
    .insert({
      session_id: id,
      sequence_number: sequenceNumber,
      status: "in_progress",
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
