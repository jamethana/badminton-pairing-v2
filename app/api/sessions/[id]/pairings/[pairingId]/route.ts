import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; pairingId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, pairingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
      { error: "Cannot modify pairings in a completed session. Change status first." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const allowed: Record<string, unknown> = {};

  if (body.status) allowed.status = body.status;
  if (body.status === "completed" || body.status === "voided") {
    allowed.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("pairings")
    .update(allowed)
    .eq("id", pairingId)
    .eq("session_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
