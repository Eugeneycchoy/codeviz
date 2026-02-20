/**
 * Typed Supabase client (browser and server).
 * Use supabaseBrowser in client components; use supabaseAdmin only on the server.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Client for browser and client components. Uses anon key; safe to use in "use client" code. */
export const supabaseBrowser =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as unknown as SupabaseClient);

/**
 * Server-only. Never import in `use client` files — the service role key would be exposed to the browser.
 * Use for admin operations that bypass RLS (e.g. syncing users from NextAuth into public.users).
 * Null when env vars are missing (e.g. at build time); callers should guard before use.
 */
export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : (null as unknown as SupabaseClient);
