import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getViewAs } from "@/lib/view-as";
import NavBar from "@/components/nav-bar";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, viewAs] = await Promise.all([getCurrentUser(), getViewAs()]);
  if (!user) redirect("/login");

  const { appUser } = user;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        isModerator={appUser.is_moderator}
        displayName={appUser.display_name}
        pictureUrl={appUser.picture_url}
        viewAs={viewAs}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
