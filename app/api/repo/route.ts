import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/repo
 * Returns repositories for the current user (id, name, slug, file_count, source_type, last_viewed_at, created_at).
 * Auth required.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id && session?.user?.email && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          email: session.user.email,
          name: session.user.name ?? null,
          avatar_url: session.user.image ?? null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (data?.id) session.user.id = data.id;
  }
  if (!session?.user?.id) {
    if (session?.user?.email && !supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            "Server configuration error: Supabase is required for user sync. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { data: repos, error } = await supabaseAdmin
    .from("repositories")
    .select("id, name, slug, file_count, source_type, source_url, last_viewed_at, created_at")
    .eq("user_id", session.user.id)
    .order("last_viewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Server error while fetching repositories" },
      { status: 500 }
    );
  }

  return NextResponse.json(repos ?? []);
}
