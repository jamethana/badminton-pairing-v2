import { cookies } from "next/headers";

export type ViewAs = "player" | "moderator";

export async function getViewAs(): Promise<ViewAs | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get("view_as")?.value;
  if (value === "player" || value === "moderator") return value;
  return null;
}
