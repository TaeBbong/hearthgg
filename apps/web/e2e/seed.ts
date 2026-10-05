import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseLeaderboardPage, type LeaderboardPage } from "@hearthgg/core/blizzard";
import { assembleSnapshot, serializeSnapshot, snapshotKey, type Snapshot } from "@hearthgg/core/snapshot";
import { getPlatformProxy } from "wrangler";

export const E2E_STATE_DIR = path.resolve(__dirname, "../.wrangler/e2e-state");
export const GENERATED_AT = Date.UTC(2026, 9, 5, 6, 0);

const root = path.resolve(__dirname, "../../..");

function synthetic(region: Snapshot["region"], mode: Snapshot["mode"], seasonId: number, names: string[]): Snapshot {
  return {
    v: 1,
    region,
    mode,
    seasonId,
    generatedAt: GENERATED_AT,
    totalSize: names.length,
    rows: names.map((name, index) => [index + 1, name, mode === "arena" ? Math.round((8 - index * 0.05) * 100) / 100 : null]),
  };
}

const filler = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

async function snapshots(): Promise<Array<{ snapshot: Snapshot; isCurrent: boolean }>> {
  const wild = JSON.parse(await readFile(path.join(root, "packages/core/test/fixtures/ap-wild-board.json"), "utf8")) as unknown[];
  const pages: LeaderboardPage[] = wild.map((page) => parseLeaderboardPage(page));
  const apWild = assembleSnapshot({
    board: { region: "AP", mode: "wild" },
    seasonId: pages[0]!.seasonId,
    generatedAt: GENERATED_AT,
    expectedTotalSize: pages[0]!.totalSize,
    pages: pages.map((data, index) => ({ page: index + 1, data })),
  });

  return [
    { snapshot: apWild, isCurrent: true },
    // Two "Sinah"s on one board exercise the namesake notice; 60 rows give three pages.
    { snapshot: synthetic("AP", "arena", 56, ["Sinah", "Other", ...filler(30, "arena"), "sinah", ...filler(27, "late")]), isCurrent: true },
    { snapshot: synthetic("AP", "arena", 55, ["OldChamp", "Sinah"]), isCurrent: false },
    { snapshot: synthetic("EU", "standard", 156, ["SINAH", "sinahfan", ...filler(10, "eu")]), isCurrent: true },
  ];
}

/** Seeds an isolated local D1/R2 state with deterministic boards for E2E runs. */
export async function seed() {
  const proxy = await getPlatformProxy<CloudflareEnv>({
    configPath: path.resolve(__dirname, "../wrangler.jsonc"),
    persist: { path: `${E2E_STATE_DIR}/v3` },
  });
  try {
    const { DB, SNAPSHOTS } = proxy.env;
    const schema = await readFile(path.join(root, "migrations/0001_boards.sql"), "utf8");
    await DB.exec("DROP TABLE IF EXISTS boards");
    for (const statement of schema.split(";").map((s) => s.replace(/--.*$/gm, "").trim()).filter(Boolean)) {
      await DB.prepare(statement).run();
    }

    for (const { snapshot, isCurrent } of await snapshots()) {
      const key = snapshotKey(snapshot);
      await SNAPSHOTS.put(key, serializeSnapshot(snapshot));
      await DB.prepare(
        `INSERT INTO boards (region, mode, season_id, is_current, snapshot_key, generated_at, total_size, last_success_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(snapshot.region, snapshot.mode, snapshot.seasonId, isCurrent ? 1 : 0, key, GENERATED_AT, snapshot.totalSize, GENERATED_AT)
        .run();
    }
  } finally {
    await proxy.dispose();
  }
}

export default seed;
