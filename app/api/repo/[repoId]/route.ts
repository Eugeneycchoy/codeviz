import { NextResponse } from "next/server";

/**
 * DELETE /api/repo/[repoId]
 * Cascade-delete repo, files, edges, explanations.
 * Auth required. Stub only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const { repoId } = await params;
  return NextResponse.json(
    { message: `TODO: implement delete repo ${repoId}` },
    { status: 200 }
  );
}
