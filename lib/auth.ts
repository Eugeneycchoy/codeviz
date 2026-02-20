/**
 * NextAuth.js v5 config: GitHub + Google OAuth, session management.
 * Supabase callbacks (e.g. sync user to public.users) to be added later.
 * Placeholder only — no business logic.
 */
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

/** Minimal config export for any code that needs the raw config. */
export const authConfig = { providers: [], secret: process.env.NEXTAUTH_SECRET };
