import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdatePlayerSchema = z.object({
  display_name: z.string().min(1).optional(),
  skill_level: z.number().int().min(1).max(10).optional(),
  is_moderator: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = UpdatePlayerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("users")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const { data: appUser } = await supabase.from("users").select("is_moderator").eq("id", appUserId).maybeSingle();
  if (!appUser?.is_moderator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminSupabase = createAdminClient();

  // Only allow deleting players without a LINE account (unlinked name slots)
  const { data: target, error: fetchError } = await adminSupabase.from("users").select("line_user_id").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (target.line_user_id) {
    return NextResponse.json({ error: "Cannot delete a player who has linked their LINE account" }, { status: 409 });
  }

  const { error } = await adminSupabase.from("users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
