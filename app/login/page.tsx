import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import LoginButton from "./login-button";

const ERROR_MESSAGES: Record<string, string> = {
  user_upsert_failed: "We couldn’t create or update your account. Please try again.",
  auth_failed: "Sign-in failed. Please try again.",
  sign_in_failed: "Sign-in failed. Please try again.",
  create_user_failed: "Account setup failed. Please try again.",
  token_exchange_failed: "LINE sign-in failed. Please try again.",
  profile_fetch_failed: "Could not load your LINE profile. Please try again.",
  invalid_state: "Invalid sign-in request. Please try again.",
  no_code: "Sign-in was cancelled or failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  // Use getCurrentUser (auth + app user) so "already logged in" matches the rest of the app.
  // Otherwise a partial session (auth user but no app_user_id/users row) causes a redirect loop:
  // session page redirects to login → login sees auth user and redirects to session → repeat.
  const user = await getCurrentUser();

  if (user) {
    const params = await searchParams;
    const next = params.next;
    if (next && typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
      redirect(next);
    }
    redirect("/");
  }

  const params = await searchParams;
  const redirectTo = typeof params.next === "string" ? params.next : undefined;
  const errorMessage = typeof params.error === "string" ? ERROR_MESSAGES[params.error] ?? "Sign-in failed. Please try again." : null;
  const isSessionInvite = typeof redirectTo === "string" && redirectTo.startsWith("/sessions/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted">
      <section
        aria-label="Sign in"
        className="w-full max-w-sm rounded-2xl border bg-card p-8 text-foreground shadow-lg"
      >
        {errorMessage && (
          <p
            className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Badminton Pairing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSessionInvite
              ? "Sign in with LINE to join this session"
              : "Sign in with LINE to join sessions and track your games"}
          </p>
        </div>
        <LoginButton redirectTo={redirectTo} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {isSessionInvite
            ? "After signing in you'll be taken to the session."
            : "New? A moderator will add you to the session once you sign in."}
        </p>
      </section>
    </main>
  );
}
