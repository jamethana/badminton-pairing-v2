import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AddPlayerSchema = z.object({
  user_id: z.string().uuid(),
});

const AddNewPlayerSchema = z.object({
  display_name: z.string().min(1),
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

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  // Support adding existing player by user_id OR creating new player by name
  if (body.user_id) {
    const parsed = AddPlayerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data, error } = await supabase
      .from("session_players")
      .insert({ session_id: id, user_id: parsed.data.user_id })
      .select(`*, users(*)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } else {
    // Create a new "name slot" user and add to session
    const parsed = AddNewPlayerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        display_name: parsed.data.display_name,
        skill_level: parsed.data.skill_level,
        is_moderator: false,
      })
      .select()
      .single();

    if (userError || !newUser) return NextResponse.json({ error: userError?.message }, { status: 500 });

    // Add to session
    const { data, error } = await supabase
      .from("session_players")
      .insert({ session_id: id, user_id: newUser.id })
      .select(`*, users(*)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }
}
