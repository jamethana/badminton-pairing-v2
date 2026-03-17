import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { appUser } = user;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </div>

      <section
        aria-label="Profile overview"
        className="rounded-xl border bg-card p-6 text-foreground shadow-sm"
      >
        <div className="flex items-center gap-4">
          {appUser.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={appUser.picture_url}
              alt={appUser.display_name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {appUser.display_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-foreground">{appUser.display_name}</p>
            {appUser.is_moderator && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Skill level: {appUser.skill_level}</span>
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  Moderator
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Profile editing is coming soon. Your display name and picture are synced from your LINE
          account.
        </div>
      </section>
    </main>
  );
}
