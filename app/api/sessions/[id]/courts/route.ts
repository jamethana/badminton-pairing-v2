import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";

async function requireModerator(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const appUserId = getAppUserId(user);
  if (!appUserId) return null;
  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  return appUser?.is_moderator ? true : null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!await requireModerator(supabase)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: session } = await supabase.from("sessions").select("num_courts").eq("id", id).single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("sessions")
    .update({ num_courts: session.num_courts + 1, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("num_courts")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!await requireModerator(supabase)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const courtNumber: number = body.court_number;

  // Ensure no game is in progress on this court
  const { count } = await supabase
    .from("pairings")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("court_number", courtNumber)
    .eq("status", "in_progress");

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Court has an active game" }, { status: 409 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("num_courts, court_names")
    .eq("id", id)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.num_courts <= 1) return NextResponse.json({ error: "Cannot remove the last court" }, { status: 400 });

  // Remove the court name entry if it exists
  const updatedNames = { ...(session.court_names as Record<string, string>) };
  delete updatedNames[String(courtNumber)];

  const { data, error } = await supabase
    .from("sessions")
    .update({ num_courts: session.num_courts - 1, court_names: updatedNames, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("num_courts, court_names")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
