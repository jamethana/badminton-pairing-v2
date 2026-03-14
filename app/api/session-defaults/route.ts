import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PutSessionDefaultsSchema = z.object({
  name: z.string().trim().max(120),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  location: z.string().trim().max(120).nullable(),
  num_courts: z.number().int().min(1).max(20),
  max_players: z.number().int().min(1).max(50),
  allow_player_assign_empty_court: z.boolean(),
  allow_player_record_own_result: z.boolean(),
  allow_player_record_any_result: z.boolean(),
  show_skill_level_pills: z.boolean(),
  allow_player_add_remove_courts: z.boolean(),
  allow_player_access_invite_qr: z.boolean(),
  pairing_rule: z.enum(["least_played", "longest_wait", "balanced"]).optional(),
  max_partner_skill_level_gap: z.number().int().min(1).max(10).optional(),
});

export type SessionDefaultsPayload = z.infer<typeof PutSessionDefaultsSchema>;

async function requireModerator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), appUserId: null as string | null };
  const appUserId = getAppUserId(user);
  if (!appUserId) return { error: NextResponse.json({ error: "No app user" }, { status: 403 }), appUserId: null as string | null };
  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle();
  if (!appUser?.is_moderator) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), appUserId: null as string | null };
  return { error: null, appUserId };
}

export async function GET() {
  const { error, appUserId } = await requireModerator();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("moderator_default_session_settings")
    .select("*")
    .eq("user_id", appUserId!)
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function PUT(request: NextRequest) {
  const { error, appUserId } = await requireModerator();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PutSessionDefaultsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payload = {
    user_id: appUserId!,
    name: parsed.data.name,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    location: parsed.data.location ?? null,
    num_courts: parsed.data.num_courts,
    max_players: parsed.data.max_players,
    allow_player_assign_empty_court: parsed.data.allow_player_assign_empty_court,
    allow_player_record_own_result: parsed.data.allow_player_record_own_result,
    allow_player_record_any_result: parsed.data.allow_player_record_any_result,
    show_skill_level_pills: parsed.data.show_skill_level_pills,
    allow_player_add_remove_courts: parsed.data.allow_player_add_remove_courts,
    allow_player_access_invite_qr: parsed.data.allow_player_access_invite_qr,
    pairing_rule: parsed.data.pairing_rule ?? "least_played",
    max_partner_skill_level_gap: parsed.data.max_partner_skill_level_gap ?? 2,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { data, error: upsertError } = await supabase
    .from("moderator_default_session_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  return NextResponse.json(data);
}
