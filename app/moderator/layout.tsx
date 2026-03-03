import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import NavBar from "@/components/nav-bar";

export default async function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.appUser.is_moderator) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        isModerator
        displayName={user.appUser.display_name}
        pictureUrl={user.appUser.picture_url}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
