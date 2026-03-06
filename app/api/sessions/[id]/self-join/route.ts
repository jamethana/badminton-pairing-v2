import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";

// Player adds themself to a session when no pre-created slot exists.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUserId = getAppUserId(user);
  if (!appUserId) {
    return NextResponse.json({ error: "No app user" }, { status: 403 });
  }

  // Prevent changes when the session is completed
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", id)
    .single();
  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
  }
  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot join a completed session. Ask a moderator to reopen it." },
      { status: 409 }
    );
  }

  // Ensure the player is not already in this session
  const { data: existingSlot, error: existingError } = await supabase
    .from("session_players")
    .select("id")
    .eq("session_id", id)
    .eq("user_id", appUserId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existingSlot) {
    return NextResponse.json(
      { error: "You already have a slot in this session" },
      { status: 409 }
    );
  }

  // Create a new session_players row for this user
  const { data, error } = await supabase
    .from("session_players")
    .insert({ session_id: id, user_id: appUserId })
    .select(`*, users(*)`)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to join session" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

