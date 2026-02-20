/**
 * NextAuth.js v5 config: GitHub + Google OAuth, session management.
 * Syncs users to public.users via supabaseAdmin on sign-in; exposes user id in session.
 */
import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "./supabase";
import { getSafeRedirectUrl } from "./redirect";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string | undefined };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string | undefined;
  }
}

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const missing: string[] = [];
  if (!process.env.NEXTAUTH_SECRET?.trim()) missing.push("NEXTAUTH_SECRET");
  if (!process.env.GITHUB_CLIENT_ID?.trim()) missing.push("GITHUB_CLIENT_ID");
  if (!process.env.GITHUB_CLIENT_SECRET?.trim()) missing.push("GITHUB_CLIENT_SECRET");
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push("GOOGLE_CLIENT_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `[auth] Missing required env in production: ${missing.join(", ")}. Set these in your environment.`
    );
  }
}

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
  // In production we rely on NEXTAUTH_URL; in dev/demo, trust Host header (e.g. tunneling).
  trustHost: process.env.NODE_ENV !== "production",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      return getSafeRedirectUrl(url, baseUrl);
    },
    async jwt({ token, user, trigger }) {
      if ((trigger === "signIn" || user) && user?.email && supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("users")
          .upsert(
            {
              email: user.email,
              name: user.name ?? null,
              avatar_url: user.image ?? null,
            },
            { onConflict: "email" }
          )
          .select("id")
          .single();
        if (data?.id) {
          token.userId = data.id;
        }
        return token;
      }
      // Recover userId if the sign-in upsert missed it (e.g. transient DB failure)
      if (!token.userId && token.email && supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", token.email)
          .single();
        if (data?.id) {
          token.userId = data.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? undefined;
      }
      return session;
    },
  },
});

/** Minimal config export for any code that needs the raw config. */
export const authConfig = { providers: [], secret: process.env.NEXTAUTH_SECRET };
