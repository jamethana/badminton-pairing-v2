import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RecordResultSchema = z.object({
  team_a_score: z.number().int().min(0),
  team_b_score: z.number().int().min(0),
  winner_team: z.enum(["team_a", "team_b"]),
});

type Params = { params: Promise<{ id: string; pairingId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id, pairingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  // Verify pairing belongs to session
  const { data: pairing } = await supabase
    .from("pairings")
    .select("*")
    .eq("id", pairingId)
    .eq("session_id", id)
    .single();

  if (!pairing) return NextResponse.json({ error: "Pairing not found" }, { status: 404 });

  // Check: moderator OR player in the pairing
  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  const isModerator = appUser?.is_moderator ?? false;
  const isParticipant = [
    pairing.team_a_player_1,
    pairing.team_a_player_2,
    pairing.team_b_player_1,
    pairing.team_b_player_2,
  ].includes(appUserId);

  if (!isModerator && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = RecordResultSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Insert result
  const { data: result, error: resultError } = await supabase
    .from("game_results")
    .insert({
      pairing_id: pairingId,
      ...parsed.data,
      recorded_by: appUserId,
    })
    .select()
    .single();

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 });

  // Mark pairing as completed
  await supabase
    .from("pairings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", pairingId);

  return NextResponse.json(result, { status: 201 });
}
