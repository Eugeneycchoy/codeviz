/**
 * Allowlist for post-login redirects. Prevents open-redirect by only allowing
 * known paths. Used by LoginForm (client) and auth redirect callback (server).
 */
export const ALLOWED_REDIRECT_PATHS = ["/dashboard", "/repo"] as const;

const ALLOWED_SET = new Set<string>(ALLOWED_REDIRECT_PATHS);

const DEFAULT_REDIRECT = "/dashboard";

/**
 * Returns the pathname (no query/hash) from a URL string. Handles relative paths
 * and absolute URLs. Returns null if parsing fails or path is empty.
 */
function pathnameFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const pathOnly = trimmed.split("?")[0].split("#")[0];
    return pathOnly || "/";
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname || "/";
  } catch {
    return null;
  }
}

/**
 * Returns a safe redirect path: the given path if it's in the allowlist,
 * otherwise the default. Use for client-side callbackUrl before signIn().
 */
export function getSafeRedirectPath(callbackUrl: string | null | undefined): string {
  const path = pathnameFromUrl(callbackUrl ?? "");
  if (path !== null && ALLOWED_SET.has(path)) return path;
  return DEFAULT_REDIRECT;
}

/**
 * Returns the URL to redirect to if it's allowed (path in allowlist and
 * relative or same-origin). Otherwise returns baseUrl + default path.
 * Use in NextAuth redirect callback.
 */
export function getSafeRedirectUrl(url: string, baseUrl: string): string {
  const path = pathnameFromUrl(url);
  if (path === null) return `${baseUrl}${DEFAULT_REDIRECT}`;
  if (!ALLOWED_SET.has(path)) return `${baseUrl}${DEFAULT_REDIRECT}`;
  if (url.startsWith("/") && !url.startsWith("//")) {
    return new URL(url, baseUrl).toString();
  }
  try {
    const full = new URL(url);
    const base = new URL(baseUrl);
    if (full.origin === base.origin) return full.toString();
  } catch {
    // fall through
  }
  return `${baseUrl}${DEFAULT_REDIRECT}`;
}
