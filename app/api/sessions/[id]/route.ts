import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SessionUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS").optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS").optional(),
    location: z.string().trim().max(120).nullable().optional(),
    num_courts: z.number().int().min(1).max(20).optional(),
    max_players: z.number().int().min(1).optional(),
    status: z.enum(["draft", "active", "completed"]).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    allow_player_assign_empty_court: z.boolean().optional(),
    allow_player_record_own_result: z.boolean().optional(),
    allow_player_record_any_result: z.boolean().optional(),
    show_skill_level_pills: z.boolean().optional(),
    allow_player_add_remove_courts: z.boolean().optional(),
    allow_player_access_invite_qr: z.boolean().optional(),
    court_names: z.record(z.string(), z.string()).optional(),
    pairing_rule: z.enum(["least_played", "longest_wait", "balanced"]).optional(),
    max_partner_skill_level_gap: z.number().int().min(1).max(10).optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    { message: "End time must be after start time", path: ["end_time"] }
  );

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      session_players(
        *,
        users(id, display_name, skill_level, picture_url, line_user_id)
      ),
      pairings(*)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = getAppUserId(user);
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SessionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

   // When a session is completed, treat it as read-only except for changing the status
   // back to "draft" or "active". This prevents court/player configuration changes
   // while still allowing moderators to reopen the session.
   const { data: session, error: sessionError } = await supabase
     .from("sessions")
     .select("status")
     .eq("id", id)
     .single();

   if (sessionError || !session) {
     return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
   }

   const updateKeys = Object.keys(parsed.data);
   const isCompleted = session.status === "completed";
   const isStatusOnlyUpdate =
     updateKeys.length === 1 &&
     updateKeys[0] === "status" &&
     parsed.data.status !== undefined &&
     parsed.data.status !== session.status;

   if (isCompleted && !isStatusOnlyUpdate && updateKeys.length > 0) {
     return NextResponse.json(
       { error: "Completed sessions are read-only. Change status back to draft or active first." },
       { status: 409 }
     );
   }

  const { data, error } = await supabase
    .from("sessions")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
