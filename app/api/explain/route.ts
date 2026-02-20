import { NextResponse } from "next/server";

/**
 * POST /api/explain
 * Body: { fileId }. Returns { explanation: string } (cached or freshly generated).
 * Auth required. Stub only.
 */
export async function POST() {
  return NextResponse.json(
    { message: "TODO: implement AI explanation (Poe API, cache in Supabase)" },
    { status: 200 }
  );
}
