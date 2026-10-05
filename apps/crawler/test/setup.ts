import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// Storage is shared across tests in a file, so start each test from empty state.
beforeEach(async () => {
  await env.DB.exec("DELETE FROM boards");
  const { objects } = await env.SNAPSHOTS.list();
  if (objects.length) await env.SNAPSHOTS.delete(objects.map((object) => object.key));
});
