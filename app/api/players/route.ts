import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type ModeratorResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

async function requireModerator(): Promise<ModeratorResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).single();
  if (!appUser?.is_moderator) return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, supabase };
}

export async function GET() {
  const auth = await requireModerator();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("display_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const CreatePlayerSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  skill_level: z.number().int().min(1).max(10).default(5),
});

export async function POST(request: NextRequest) {
  const auth = await requireModerator();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = CreatePlayerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const messages = [
      ...flat.formErrors,
      ...Object.entries(flat.fieldErrors).map(([f, msgs]) => `${f}: ${(msgs ?? []).join(", ")}`),
    ];
    return NextResponse.json({ error: messages.join("; ") || "Invalid input" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("users")
    .insert({ display_name: parsed.data.display_name, skill_level: parsed.data.skill_level })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
