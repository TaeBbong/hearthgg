/** The one host pages are served from; keep in sync with NEXT_PUBLIC_SITE_URL in .env.production. */
const CANONICAL_HOST = "hsgg.dev";

/**
 * Hosts that reach this Worker but only redirect: the original workers.dev address (already shared
 * in links) and www (a custom domain in wrangler.jsonc). Redirect Rules can't cover workers.dev,
 * which isn't our zone, so the Worker does it.
 */
const ALIAS_HOSTS = new Set(["rank.hsgg.workers.dev", "www.hsgg.dev"]);

/** A permanent redirect to the same page on the canonical host, or null when already there. */
export function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (!ALIAS_HOSTS.has(url.hostname)) return null;
  url.protocol = "https:";
  url.host = CANONICAL_HOST;
  return Response.redirect(url.toString(), 301);
}
