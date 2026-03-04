import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AddPlayerSchema = z.object({
  user_id: z.string().uuid(),
});

// quality-3: Added .trim() and .max(80) to match players/route.ts
const AddNewPlayerSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  skill_level: z.number().int().min(1).max(10).default(5),
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
    .from("session_players")
    .select(`*, users(*)`)
    .eq("session_id", id);

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

  // quality-1: Use typed helper instead of unsafe cast
  const appUserId = getAppUserId(user);
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // quality-2: Guard against malformed JSON bodies
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Support adding existing player by user_id OR creating new player by name
  const addExisting = AddPlayerSchema.safeParse(body);
  if (addExisting.success) {
    const { data, error } = await supabase
      .from("session_players")
      .insert({ session_id: id, user_id: addExisting.data.user_id })
      .select(`*, users(*)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Create a new "name slot" user and add to session
  const parsed = AddNewPlayerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // react-5: Use admin client consistently for name-slot user creation (same as players/route.ts)
  const adminSupabase = createAdminClient();
  const { data: newUser, error: userError } = await adminSupabase
    .from("users")
    .insert({
      display_name: parsed.data.display_name,
      skill_level: parsed.data.skill_level,
      is_moderator: false,
    })
    .select()
    .single();

  if (userError || !newUser) return NextResponse.json({ error: userError?.message }, { status: 500 });

  // Add to session using the scoped client (for RLS on session_players)
  const { data, error } = await supabase
    .from("session_players")
    .insert({ session_id: id, user_id: newUser.id })
    .select(`*, users(*)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
