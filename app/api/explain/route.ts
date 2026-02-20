import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/explain
 * Body: { fileId }. Returns { explanation: string } (cached or freshly generated).
 * Auth required. Stub only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { message: "TODO: implement AI explanation (Poe API, cache in Supabase)" },
    { status: 200 }
  );
}
