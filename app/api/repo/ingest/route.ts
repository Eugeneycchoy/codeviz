import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/repo/ingest
 * Accept ZIP (multipart/form-data) or { gitUrl } JSON; returns { repoId }.
 * Auth required. Stub only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { message: "TODO: implement repo ingest (ZIP upload or git URL)" },
    { status: 200 }
  );
}
