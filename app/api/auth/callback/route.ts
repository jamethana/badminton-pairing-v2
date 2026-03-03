import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
      throw new Error(`LINE token exchange failed (${tokenRes.status}): ${body}`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      id_token?: string;
    };

    // Fetch LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const body = await profileRes.text();
      throw new Error(`LINE profile fetch failed (${profileRes.status}): ${body}`);
    }

    const profile = await profileRes.json() as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    // Use admin client to bypass RLS for user management operations
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
        {
          onConflict: "line_user_id",
          ignoreDuplicates: false,
        }
      )
      .select("id, skill_level, is_moderator")
      .single();

    if (upsertError || !appUser) {
      throw new Error(`User upsert failed: ${upsertError?.message}`);
    }

    // Create or retrieve the Supabase auth user (email/password with deterministic pattern)
    const lineEmail = `line_${profile.userId}@badminton.app`;
    const linePassword = `line_${profile.userId}_${channelId}`;

    // Try to find existing auth user
    const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === lineEmail);

    if (!existingAuthUser) {
      // Create confirmed Supabase auth user (skip email confirmation)
      const { error: createAuthError } = await adminSupabase.auth.admin.createUser({
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

      if (createAuthError) {
        throw new Error(`Auth user creation failed: ${createAuthError.message}`);
      }
    } else {
      // Update metadata for returning user
      await adminSupabase.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
          app_user_id: appUser.id,
        },
      });
    }

    // Sign in using the regular server client (sets the session cookie)
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lineEmail,
      password: linePassword,
    });

    if (signInError) {
      throw new Error(`Sign in failed: ${signInError.message}`);
    }

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("LINE auth callback error:", err);
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed`, request.url)
    );
  }
}
