import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/repo/[repoId]/graph
 * Returns { nodes: FileNode[], edges: Edge[] } for React Flow.
 * Auth required. Stub only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { repoId } = await params;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const { data: repo, error } = await supabaseAdmin
    .from("repositories")
    .select("user_id")
    .eq("id", repoId)
    .single();
  if (error) {
    return NextResponse.json(
      { error: "Server error while fetching repository" },
      { status: 500 }
    );
  }
  if (!repo || repo.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    { message: `TODO: implement graph for repo ${repoId}` },
    { status: 200 }
  );
}
