import type { FullConfig } from "@playwright/test";
import { seed } from "./seed";

// The dev server compiles routes on first request; warm them once so parallel tests don't time out.
const WARM_ROUTES = ["/", "/search?q=sinah", "/ap/arena", "/ap/arena/55", "/ap/arena/56/sinah", "/api/search?q=s", "/kr/arena"];

export default async function globalSetup(config: FullConfig) {
  await seed();
  const baseURL = config.projects[0]?.use.baseURL;
  for (const route of WARM_ROUTES) await fetch(`${baseURL}${route}`);
}
