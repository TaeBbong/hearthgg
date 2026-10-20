import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Cache Components stays off: on the Workers runtime (OpenNext) it hangs requests
  // (vercel/next.js#94880, opennextjs-cloudflare#1225, #1369). Pages already stream
  // through <Suspense>, so turning it on later only adds the prerendered shell.
  transpilePackages: ["@hearthgg/core"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nothing here is meant to be framed; X-Frame-Options covers browsers without frame-ancestors.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Expose D1/R2 bindings to `next dev`, sharing local state with the crawler's `wrangler dev`.
// E2E runs point HEARTHGG_STATE_DIR at an isolated, seeded state directory.
initOpenNextCloudflareForDev({ persist: { path: `${process.env.HEARTHGG_STATE_DIR ?? "../../.wrangler/state"}/v3` } });
