/**
 * NextAuth.js v5 config: GitHub + Google OAuth, session management.
 * Syncs users to public.users via supabaseAdmin on sign-in; exposes user id in session.
 */
import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "./supabase";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
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
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
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
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});

/** Minimal config export for any code that needs the raw config. */
export const authConfig = { providers: [], secret: process.env.NEXTAUTH_SECRET };
