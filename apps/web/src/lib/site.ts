/** Public origin for absolute URLs (metadata, sitemap). Production sets it in .env.production. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const CONTACT_URL = "https://github.com/TaeBbong/hearthgg/issues";

/** GA4 measurement ID (Firebase project "hearthgg"); only production sets it, so dev and tests send nothing. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
