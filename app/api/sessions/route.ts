import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// quality-3: Date and time format validators
const CreateSessionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS"),
  location: z.string().trim().max(120).optional(),
  num_courts: z.number().int().min(1).max(10).default(4),
  max_players: z.number().int().min(1).max(50).default(24),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
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

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...parsed.data, created_by: appUserId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
