import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePairing } from "@/lib/algorithms/pairing";
import { canAssignCourt } from "@/lib/sessions/permissions";

const GeneratePairingSchema = z.object({
  generate: z.literal(true),
  court_number: z.number().int().min(1),
});

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

  const appUserId = getAppUserId(user);
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const [{ data: appUser }, { data: session }] = await Promise.all([
    supabase.from("users").select("is_moderator").eq("id", appUserId).single(),
    supabase
      .from("sessions")
      .select("allow_player_assign_empty_court, allow_player_record_own_result, allow_player_record_any_result, status, pairing_rule, max_partner_skill_level_gap")
      .eq("id", id)
      .single(),
  ]);

  const isModerator = appUser?.is_moderator ?? false;
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot create or assign pairings for a completed session. Change status first." },
      { status: 409 }
    );
  }

  if (!canAssignCourt({ isModerator, session })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // quality-2: Guard against malformed JSON bodies
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // quality-3: Validate the generate branch with its own schema
  const generateParsed = GeneratePairingSchema.safeParse(body);
  if (generateParsed.success) {
    const { court_number: courtNumber } = generateParsed.data;

    // perf-3: Fetch sessionPlayers and pairings in parallel
    const [{ data: sessionPlayers }, { data: pairings }] = await Promise.all([
      supabase
        .from("session_players")
        .select(`users(*)`)
        .eq("session_id", id)
        .eq("is_active", true),
      supabase
        .from("pairings")
        .select("*")
        .eq("session_id", id),
    ]);

    const activePlayers = (sessionPlayers ?? [])
      .map((sp) => sp.users)
      .filter((u): u is NonNullable<typeof u> => u !== null);

    const suggestion = generatePairing(activePlayers, pairings ?? [], courtNumber, {
      pairingRule: session.pairing_rule ?? "least_played",
      maxPartnerSkillLevelGap: session.max_partner_skill_level_gap ?? 2,
    });
    if (!suggestion) {
      return NextResponse.json({ error: "Not enough available players" }, { status: 422 });
    }

    return NextResponse.json({ suggestion });
  }

  const parsed = CreatePairingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // sec-3: Use atomic RPC to get next sequence number, preventing race conditions
  const { data: sequenceNumber, error: seqError } = await supabase
    .rpc("next_pairing_sequence", { p_session_id: id });

  if (seqError || sequenceNumber === null) {
    console.error("Failed to get sequence number:", seqError);
    return NextResponse.json({ error: "Failed to generate sequence number" }, { status: 500 });
  }

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
