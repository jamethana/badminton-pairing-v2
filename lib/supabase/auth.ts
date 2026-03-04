import { cache } from "react";
import { createClient } from "./server";
import type { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type AppUser = Tables<"users">;

/**
 * quality-1: Typed runtime helper to safely extract app_user_id from JWT metadata.
 * Avoids the unsafe `as string | undefined` cast used across API routes.
 */
export function getAppUserId(user: User): string | undefined {
  const id = user.user_metadata?.app_user_id;
  return typeof id === "string" ? id : undefined;
}

/**
 * perf-1: Wrapped with React.cache() so multiple RSCs in the same request tree
 * share a single auth + DB round-trip instead of each firing both queries.
 *
 * quality-5: DB errors are now logged rather than silently swallowed.
 */
export const getCurrentUser = cache(async (): Promise<{
  authUser: { id: string; email?: string };
  appUser: AppUser;
} | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const appUserId = getAppUserId(user);
  if (!appUserId) return null;

  const { data: appUser, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", appUserId)
    .single();

  if (error) {
    console.error("getCurrentUser DB error:", error);
    return null;
  }

  if (!appUser) return null;

  return { authUser: user, appUser };
});
