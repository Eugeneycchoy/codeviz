import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * DELETE /api/repo/[slug]
 * Resolves repo by slug and user; deletes repository (cascade handled by DB).
 * Auth required.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const { data: repo, error } = await supabaseAdmin
    .from("repositories")
    .select("id, user_id")
    .eq("user_id", session.user.id)
    .eq("slug", slug)
    .single();
  if (error || !repo) {
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }
  if (repo.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { error: deleteError } = await supabaseAdmin
    .from("repositories")
    .delete()
    .eq("id", repo.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 }
    );
  }
  return new NextResponse(null, { status: 204 });
}
