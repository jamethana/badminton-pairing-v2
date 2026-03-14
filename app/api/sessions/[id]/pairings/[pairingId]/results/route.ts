import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeTrueskillUpdateForCompletedGame } from "@/lib/ratings/trueskill";
import { canRecordOwnResult, canRecordAnyResult } from "@/lib/sessions/permissions";

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

  // Fetch pairing + session + user role in parallel
  const [{ data: pairing }, { data: appUser }, { data: session }] = await Promise.all([
    supabase.from("pairings").select("*").eq("id", pairingId).eq("session_id", id).maybeSingle(),
    supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle(),
    supabase
      .from("sessions")
      .select("allow_player_assign_empty_court, allow_player_record_own_result, allow_player_record_any_result, status")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!pairing) return NextResponse.json({ error: "Pairing not found" }, { status: 404 });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot record results for a completed session. Change status first." },
      { status: 409 }
    );
  }

  const isModerator = appUser?.is_moderator ?? false;

  // Check permission: moderator, or player with appropriate session flag
  const allowed =
    canRecordAnyResult({ isModerator, session }) ||
    canRecordOwnResult({ isModerator, session, pairing, userId: appUserId });

  if (!allowed) {
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

  if (resultError || !result) {
    return NextResponse.json({ error: resultError?.message ?? "Failed to record result" }, { status: 500 });
  }

  // Fetch the four users involved so we can update their TrueSkill ratings.
  // Use the admin client here to bypass RLS for the internal rating fields.
  const adminSupabase = createAdminClient();

  const playerIds = [
    pairing.team_a_player_1,
    pairing.team_a_player_2,
    pairing.team_b_player_1,
    pairing.team_b_player_2,
  ].filter((id): id is string => id != null);

  const { data: players, error: playersError } =
    playerIds.length === 4
      ? await adminSupabase.from("users").select("*").in("id", playerIds)
      : { data: null, error: new Error("Missing player slot (deleted user)") };

  if (playersError || !players || players.length !== 4) {
    // Still mark pairing completed even if rating update fails; log but don't block UX.
    console.error("Failed to load players for TrueSkill update:", playersError);
    await supabase
      .from("pairings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", pairingId);

    return NextResponse.json(result, { status: 201 });
  }

  const usersById = new Map(players.map((u) => [u.id, u]));
  const snapshots = computeTrueskillUpdateForCompletedGame({
    usersById,
    pairing,
    result,
  });

  const now = new Date().toISOString();

  if (snapshots.length > 0) {
    const results = await Promise.all(
      snapshots.map((s) =>
        adminSupabase
          .from("users")
          .update({
            trueskill_mu: s.mu,
            trueskill_sigma: s.sigma,
            trueskill_updated_at: now,
          })
          .eq("id", s.userId)
      )
    );

    for (const r of results) {
      if (r.error) {
        console.error("Failed to update TrueSkill rating for user:", r.error);
      }
    }
  }

  // Mark pairing as completed
  await supabase
    .from("pairings")
    .update({ status: "completed", completed_at: now })
    .eq("id", pairingId);

  return NextResponse.json(result, { status: 201 });
}
