import { NextResponse } from "next/server";

/**
 * GET /api/repo/[repoId]/graph
 * Returns { nodes: FileNode[], edges: Edge[] } for React Flow.
 * Auth required. Stub only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const { repoId } = await params;
  return NextResponse.json(
    { message: `TODO: implement graph for repo ${repoId}` },
    { status: 200 }
  );
}
