import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Always redirect back to the same origin (prod, preview, or localhost)
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
