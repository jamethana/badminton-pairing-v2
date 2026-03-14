import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; playerId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, playerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  // Prevent changes when the session is completed
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
  }
  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot update players in a completed session. Change status first." },
      { status: 409 }
    );
  }

  const body = await request.json();

  // Players can only toggle their own is_active; moderators can toggle anyone
  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle();
  const isModerator = appUser?.is_moderator ?? false;

  // Get the session_player record
  const { data: sp } = await supabase
    .from("session_players")
    .select("user_id")
    .eq("id", playerId)
    .eq("session_id", id)
    .maybeSingle();

  if (!sp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isModerator && sp.user_id !== appUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Limit what can be updated
  const allowed: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") allowed.is_active = body.is_active;

  const { data, error } = await supabase
    .from("session_players")
    .update(allowed)
    .eq("id", playerId)
    .eq("session_id", id)
    .select(`*, users(*)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, playerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Prevent changes when the session is completed
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
  }
  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot update players in a completed session. Change status first." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("session_players")
    .delete()
    .eq("id", playerId)
    .eq("session_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
