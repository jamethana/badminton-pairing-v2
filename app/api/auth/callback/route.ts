import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error || "no_code")}`, request.url)
    );
  }

  // sec-2: Verify OAuth CSRF state parameter where possible.
  // Some mobile browsers and in-app flows may drop the lightweight
  // `line_oauth_state` cookie we set in JS, which would otherwise
  // cause a hard failure and "loop back to login" after consent.
  //
  // We keep strong protection when the cookie is present (detecting
  // mismatched state), but allow the flow to continue if the cookie
  // has been stripped while a state param is still provided.
  const expectedState = request.cookies.get("line_oauth_state")?.value;
  if (!state) {
    console.error("OAuth callback missing state parameter");
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }
  if (expectedState && state !== expectedState) {
    console.error("OAuth state mismatch — possible CSRF attempt");
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  // Build the redirect response early so we can set session cookies directly on it
  const successResponse = NextResponse.redirect(new URL("/", request.url));
  // Clear the state cookie now that it has been validated
  successResponse.cookies.set("line_oauth_state", "", { maxAge: 0, path: "/" });

  try {
    const callbackUrl = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL!;
    const channelId = process.env.LINE_CHANNEL_ID!;
    const channelSecret = process.env.LINE_CHANNEL_SECRET!;

    // Exchange code for LINE tokens
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error(`LINE token exchange failed (${tokenRes.status}):`, body);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    // quality-15: Validate LINE token response instead of unsafe cast
    const tokenJson = await tokenRes.json() as Record<string, unknown>;
    const access_token = typeof tokenJson.access_token === "string" ? tokenJson.access_token : null;
    if (!access_token) {
      console.error("LINE token response missing access_token");
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    // Fetch LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      const body = await profileRes.text();
      console.error(`LINE profile fetch failed (${profileRes.status}):`, body);
      return NextResponse.redirect(new URL("/login?error=profile_fetch_failed", request.url));
    }

    const profile = await profileRes.json() as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    // Use admin client (service role) to bypass RLS for user management
    const adminSupabase = createAdminClient();

    // Upsert the app-level user record — auth_secret is intentionally excluded
    // so it is never overwritten once set.
    const { data: appUser, error: upsertError } = await adminSupabase
      .from("users")
      .upsert(
        {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "line_user_id", ignoreDuplicates: false }
      )
      .select("id, auth_secret")
      .single();

    if (upsertError || !appUser) {
      console.error("User upsert failed:", upsertError);
      return NextResponse.redirect(new URL("/login?error=user_upsert_failed", request.url));
    }

    // sec-1: Use a per-user random secret instead of a deterministic password.
    // Generate once on first login and persist; never regenerate to avoid
    // invalidating existing sessions.
    let authSecret = appUser.auth_secret;
    if (!authSecret) {
      authSecret = crypto.randomUUID();
      const { error: secretError } = await adminSupabase
        .from("users")
        .update({ auth_secret: authSecret })
        .eq("id", appUser.id);
      if (secretError) {
        console.error("Failed to store auth_secret:", secretError);
        return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
      }
    }

    const lineEmail = `line_${profile.userId}@badminton.app`;
    const linePassword = authSecret;

    // The Supabase SSR client writes session cookies directly onto successResponse
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              successResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Try signing in first — works for returning users
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: lineEmail,
      password: linePassword,
    });

    if (!signInError && signInData.user) {
      // Returning user: ensure JWT metadata has line_user_id
      if (!signInData.user.user_metadata?.line_user_id) {
        await adminSupabase.auth.admin.updateUserById(signInData.user.id, {
          user_metadata: {
            line_user_id: profile.userId,
            display_name: profile.displayName,
            picture_url: profile.pictureUrl,
            app_user_id: appUser.id,
          },
        });
        // Re-sign-in so the new JWT contains the updated metadata
        const { error: reSignInError } = await supabase.auth.signInWithPassword({
          email: lineEmail,
          password: linePassword,
        });
        if (reSignInError) {
          console.error("Re-sign-in after metadata update failed:", reSignInError.message);
          return NextResponse.redirect(new URL("/login?error=sign_in_failed", request.url));
        }
      }
    } else {
      // New user (or migrated user): create confirmed auth account with full metadata.
      const { error: createError } = await adminSupabase.auth.admin.createUser({
        email: lineEmail,
        password: linePassword,
        email_confirm: true,
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
          app_user_id: appUser.id,
        },
      });

      if (createError) {
        console.error("Auth user creation failed:", createError.message);

        // If the auth user already exists (from an older flow), repair it instead
        // of hard-failing with a redirect loop.
        const message = createError.message?.toLowerCase() ?? "";
        const isAlreadyRegistered =
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("duplicate key") ||
          message.includes("email already");

        if (isAlreadyRegistered) {
          try {
            // Best-effort: locate the existing auth user by email and align its
            // password + metadata with the current LINE profile / app user.
            const {
              data: existingUsers,
              error: listError,
            } = await adminSupabase.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });

            if (listError) {
              console.error("Failed to list auth users for repair:", listError.message);
              return NextResponse.redirect(new URL("/login?error=create_user_failed", request.url));
            }

            const existingUser = existingUsers.users.find(
              (u) => u.email?.toLowerCase() === lineEmail.toLowerCase()
            );

            if (!existingUser) {
              console.error(
                "Auth user already registered but not found by email:",
                lineEmail
              );
              return NextResponse.redirect(new URL("/login?error=create_user_failed", request.url));
            }

            const { error: updateError } =
              await adminSupabase.auth.admin.updateUserById(existingUser.id, {
                password: linePassword,
                user_metadata: {
                  ...(existingUser.user_metadata ?? {}),
                  line_user_id: profile.userId,
                  display_name: profile.displayName,
                  picture_url: profile.pictureUrl,
                  app_user_id: appUser.id,
                },
              });

            if (updateError) {
              console.error("Failed to update existing auth user:", updateError.message);
              return NextResponse.redirect(new URL("/login?error=create_user_failed", request.url));
            }

            const { error: repairedSignInError } =
              await supabase.auth.signInWithPassword({
                email: lineEmail,
                password: linePassword,
              });

            if (repairedSignInError) {
              console.error(
                "Sign-in after repairing existing auth user failed:",
                repairedSignInError.message
              );
              return NextResponse.redirect(new URL("/login?error=sign_in_failed", request.url));
            }

            return successResponse;
          } catch (repairErr) {
            console.error("Unexpected error while repairing existing auth user:", repairErr);
            return NextResponse.redirect(new URL("/login?error=create_user_failed", request.url));
          }
        }

        return NextResponse.redirect(new URL("/login?error=create_user_failed", request.url));
      }

      const { error: finalSignInError } = await supabase.auth.signInWithPassword({
        email: lineEmail,
        password: linePassword,
      });

      if (finalSignInError) {
        console.error("Sign-in after create failed:", finalSignInError.message);
        return NextResponse.redirect(new URL("/login?error=sign_in_failed", request.url));
      }
    }

    return successResponse;
  } catch (err) {
    console.error("LINE auth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
