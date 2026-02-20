/**
 * Protect /dashboard, /repo/*, and selected API routes. Redirects unauthenticated
 * requests to /login. API matchers provide defence-in-depth alongside route-level auth().
 */
import { NextResponse } from "next/server";
import { auth } from "./lib/auth";

export default auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/repo/:path*",
    "/api/repo/:path*",
    "/api/explain",
  ],
};
