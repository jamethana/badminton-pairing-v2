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

    // Exchange code for tokens
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
      throw new Error("Failed to exchange code for token");
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
      throw new Error("Failed to fetch LINE profile");
    }

    const profile = await profileRes.json() as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    const supabase = await createClient();

    // Try to find existing Supabase user by LINE user ID
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .eq("line_user_id", profile.userId)
      .limit(1);

    let userId: string;

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;

      // Update profile info
      await supabase
        .from("users")
        .update({
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      // Create new user record
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          skill_level: 5,
          is_moderator: false,
        })
        .select("id")
        .single();

      if (insertError || !newUser) {
        throw new Error("Failed to create user record");
      }
      userId = newUser.id;
    }

    // Sign in via Supabase auth using email/password with a deterministic email
    // We use a pattern: line_{userId}@badminton.app
    const lineEmail = `line_${profile.userId}@badminton.app`;
    const linePassword = `line_${profile.userId}_${channelId}`;

    // Try signing in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lineEmail,
      password: linePassword,
    });

    if (signInError) {
      // Create Supabase auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email: lineEmail,
        password: linePassword,
        options: {
          data: {
            line_user_id: profile.userId,
            display_name: profile.displayName,
            picture_url: profile.pictureUrl,
            app_user_id: userId,
          },
        },
      });

      if (signUpError) {
        throw new Error(`Auth signup failed: ${signUpError.message}`);
      }

      // Sign in after sign up
      const { error: finalSignInError } = await supabase.auth.signInWithPassword({
        email: lineEmail,
        password: linePassword,
      });

      if (finalSignInError) {
        throw new Error(`Final sign in failed: ${finalSignInError.message}`);
      }
    }

    const response = NextResponse.redirect(new URL("/", request.url));
    return response;
  } catch (err) {
    console.error("LINE auth callback error:", err);
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed`, request.url)
    );
  }
}
