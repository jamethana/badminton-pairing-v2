import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ClaimSchema = z.object({
  session_player_id: z.string().uuid(), // the unclaimed session_player row id
});

// Player claims a name slot in a session
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
      { error: "Cannot claim a slot in a completed session. Ask a moderator to reopen it." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Get the target slot
  const { data: slot } = await supabase
    .from("session_players")
    .select(`*, users(line_user_id)`)
    .eq("id", parsed.data.session_player_id)
    .eq("session_id", id)
    .maybeSingle();

  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  // Slot must be unclaimed (user has no line_user_id)
  if ((slot.users as { line_user_id: string | null } | null)?.line_user_id) {
    return NextResponse.json({ error: "Slot already claimed" }, { status: 409 });
  }

  // Check player isn't already in this session
  const { data: existingSlot } = await supabase
    .from("session_players")
    .select("id")
    .eq("session_id", id)
    .eq("user_id", appUserId)
    .maybeSingle();

  if (existingSlot) {
    return NextResponse.json({ error: "You already have a slot in this session" }, { status: 409 });
  }

  // Link the logged-in user's LINE account to the slot's user record
  const lineUserId = user.user_metadata?.line_user_id as string | undefined;
  if (lineUserId) {
    await supabase
      .from("users")
      .update({
        line_user_id: lineUserId,
        picture_url: user.user_metadata?.picture_url as string | undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slot.user_id);
  }

  // Update session_player to point to the logged-in user's app record
  // (merge: keep the slot's user but link their line account to this app user_id)
  // Actually: we update the session_player.user_id to the logged-in app user
  const { data, error } = await supabase
    .from("session_players")
    .update({ user_id: appUserId })
    .eq("id", parsed.data.session_player_id)
    .eq("session_id", id)
    .select(`*, users(*)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
