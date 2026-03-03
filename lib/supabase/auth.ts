import { createClient } from "./server";
import type { Tables } from "@/types/database";

export type AppUser = Tables<"users">;

/**
 * Gets the current authenticated user and their app user record.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<{
  authUser: { id: string; email?: string };
  appUser: AppUser;
} | null> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log(`[getCurrentUser] getUser: id=${user?.id ?? "null"} metadata=${JSON.stringify(user?.user_metadata ?? null)} err=${authErr?.message ?? "none"}`);
  if (!user) return null;

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) {
    console.log("[getCurrentUser] no app_user_id in metadata");
    return null;
  }

  const { data: appUser, error: dbErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", appUserId)
    .single();

  console.log(`[getCurrentUser] users query: appUserId=${appUserId} found=${!!appUser} err=${dbErr?.message ?? "none"}`);
  if (!appUser) return null;

  return { authUser: user, appUser };
}
