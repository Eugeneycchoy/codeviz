import { NextResponse } from "next/server";

/**
 * POST /api/repo/ingest
 * Accept ZIP (multipart/form-data) or { gitUrl } JSON; returns { repoId }.
 * Auth required. Stub only.
 */
export async function POST() {
  return NextResponse.json(
    { message: "TODO: implement repo ingest (ZIP upload or git URL)" },
    { status: 200 }
  );
}
