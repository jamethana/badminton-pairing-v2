import { getCurrentUser } from "@/lib/supabase/auth";
import { getViewAs } from "@/lib/view-as";
import { redirect } from "next/navigation";
import NavBar from "@/components/nav-bar";

export default async function ProfilePage() {
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit profile</h1>
          <p className="text-sm text-gray-500">Manage your account details</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-4">
            {appUser.picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appUser.picture_url}
                alt={appUser.display_name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
                {appUser.display_name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-gray-900">{appUser.display_name}</p>
              <p className="text-sm text-gray-500">
                Skill level: {appUser.skill_level}
                {appUser.is_moderator && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Moderator
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Profile editing is coming soon. Your display name and picture are synced from your LINE account.
          </div>
        </div>
      </main>
    </div>
  );
}
