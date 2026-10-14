import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// Storage is shared across tests in a file, so start each test from empty state.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM boards"),
    env.DB.prepare("DELETE FROM rank_history"),
    env.DB.prepare("DELETE FROM rank_points"),
    env.DB.prepare("DELETE FROM history_days"),
    env.DB.prepare("DELETE FROM upstream_state"),
    env.DB.prepare("DELETE FROM request_budget"),
    env.DB.prepare("DELETE FROM daily_reports"),
  ]);
  const { objects } = await env.SNAPSHOTS.list();
  if (objects.length) await env.SNAPSHOTS.delete(objects.map((object) => object.key));
});
