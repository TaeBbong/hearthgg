import { spawn } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import { seed } from "./seed";

// The dev server compiles routes on first request; warm them once so parallel tests don't time out.
const WARM_ROUTES = ["/", "/search?q=sinah", "/ap/arena", "/ap/arena/55", "/ap/arena/56/sinah", "/api/search?q=s", "/kr/arena"];

async function waitFor(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Dev server did not start at ${url}`);
}

/**
 * Seeds first, then starts the dev server. Playwright's `webServer` would start
 * before global setup, and two local runtimes opening the same SQLite files at
 * once fails with SQLITE_BUSY.
 */
export default async function globalSetup(config: FullConfig) {
  await seed();

  const baseURL = config.projects[0]!.use.baseURL!;
  const server = spawn("npx", ["next", "dev", "--port", new URL(baseURL).port], {
    env: { ...process.env, HEARTHGG_STATE_DIR: ".wrangler/e2e-state" },
    stdio: process.env.DEBUG ? "inherit" : "ignore",
    detached: true,
  });
  await waitFor(baseURL, 120_000);
  for (const route of WARM_ROUTES) await fetch(`${baseURL}${route}`);

  return async () => {
    // Negative pid: stop the whole process group (npx, next and its workers).
    if (server.pid) process.kill(-server.pid, "SIGTERM");
  };
}
