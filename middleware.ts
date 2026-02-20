/**
 * Protect /dashboard and /repo/* routes. Passthrough only — no auth checks yet.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/repo/:path*"],
};
