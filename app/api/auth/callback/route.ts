import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error || "no_code")}`, request.url)
    );
  }

  // Build the success redirect response early so we can set cookies on it
  const successResponse = NextResponse.redirect(new URL("/", request.url));
  const failResponse = (msg: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));

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
      return failResponse("token_exchange_failed");
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
    };

    // Fetch LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const body = await profileRes.text();
      console.error(`LINE profile fetch failed (${profileRes.status}):`, body);
      return failResponse("profile_fetch_failed");
    }

    const profile = await profileRes.json() as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    // Use admin client (service role) to bypass RLS
    const adminSupabase = createAdminClient();

    // Upsert the user record in our users table
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
      .select("id")
      .single();

    if (upsertError || !appUser) {
      console.error("User upsert failed:", upsertError);
      return failResponse("user_upsert_failed");
    }

    // Deterministic Supabase auth credentials derived from LINE user ID
    const lineEmail = `line_${profile.userId}@badminton.app`;
    const linePassword = `line_${profile.userId}_${channelId}`;

    // Try to create the auth user (email_confirm: true bypasses email confirmation).
    // If the user already exists, createUser returns an error — that's fine, we just sign in.
    await adminSupabase.auth.admin.createUser({
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
    // Ignore createUser errors — the user may already exist, which is fine.

    // Create a Supabase client that writes session cookies directly onto the
    // redirect response (not via next/headers, which wouldn't attach to the redirect).
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lineEmail,
      password: linePassword,
    });

    if (signInError) {
      console.error("Sign in failed:", signInError.message);
      return failResponse("sign_in_failed");
    }

    return successResponse;
  } catch (err) {
    console.error("LINE auth callback error:", err);
    return failResponse("auth_failed");
  }
}
