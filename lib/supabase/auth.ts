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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const appUserId = user.user_metadata?.app_user_id as string | undefined;
  if (!appUserId) return null;

  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", appUserId)
    .single();

  if (!appUser) return null;

  return { authUser: user, appUser };
}
