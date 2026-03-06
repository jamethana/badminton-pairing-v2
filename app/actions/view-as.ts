"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { ViewAs } from "@/lib/view-as";

export async function switchViewAs(view: ViewAs) {
  const user = await getCurrentUser();
  if (!user?.appUser.is_moderator) return;

  const cookieStore = await cookies();
  cookieStore.set("view_as", view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  redirect(view === "player" ? "/" : "/moderator");
}
