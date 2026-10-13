import { BOARDS } from "@hearthgg/core/domain";
import type { MetadataRoute } from "next";
import { boardHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

// Player pages are reached through the boards; listing every name would be tens of thousands of URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...BOARDS.map((board) => ({ url: `${SITE_URL}${boardHref(board)}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...["/status", "/terms", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly" as const, priority: 0.2 })),
  ];
}
