import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseLeaderboardPage, type LeaderboardPage } from "@hearthgg/core/blizzard";
import { assembleSnapshot, serializeSnapshot, snapshotKey, type Snapshot } from "@hearthgg/core/snapshot";
import { getPlatformProxy } from "wrangler";

export const E2E_STATE_DIR = path.resolve(__dirname, "../.wrangler/e2e-state");
export const GENERATED_AT = Date.UTC(2026, 9, 5, 6, 0);

const root = path.resolve(__dirname, "../../..");
const HISTORY_DAYS = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];

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
    // Past the top 1,000 ranks, rows come from an older full crawl.
    {
      snapshot: { ...synthetic("AP", "battlegrounds", 19, filler(1_100, "bg")), deepGeneratedAt: GENERATED_AT - 2 * 3_600_000 },
      isCurrent: true,
    },
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
    for (const table of ["boards", "rank_history", "history_days", "upstream_state", "request_budget"]) await DB.exec(`DROP TABLE IF EXISTS ${table}`);
    const migrations = (await readdir(path.join(root, "migrations"))).filter((file) => file.endsWith(".sql")).toSorted();
    for (const file of migrations) {
      const sql = await readFile(path.join(root, "migrations", file), "utf8");
      // Strip comments before splitting: they may contain semicolons.
      const statements = sql.replace(/--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);
      for (const statement of statements) {
        await DB.prepare(statement).run();
      }
    }

    for (const { snapshot, isCurrent } of await snapshots()) {
      const key = snapshotKey(snapshot);
      await SNAPSHOTS.put(key, serializeSnapshot(snapshot));
      await DB.prepare(
        `INSERT INTO boards (region, mode, season_id, is_current, snapshot_key, generated_at, deep_generated_at, total_size, last_success_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          snapshot.region,
          snapshot.mode,
          snapshot.seasonId,
          isCurrent ? 1 : 0,
          key,
          GENERATED_AT,
          snapshot.deepGeneratedAt ?? GENERATED_AT,
          snapshot.totalSize,
          GENERATED_AT,
        )
        .run();
    }

    // Five days of closing ranks for the two AP arena "sinah" namesakes.
    const history = DB.prepare(
      "INSERT INTO rank_history (region, mode, season_id, name, day, rank, rating) VALUES ('AP', 'arena', 56, 'sinah', ?, ?, ?)",
    );
    await DB.batch(
      HISTORY_DAYS.flatMap((day, index) => [
        history.bind(day, [5, 3, 2, 1, 1][index]!, 7 + index / 10),
        history.bind(day, [40, 38, 35, 34, 33][index]!, 6 + index / 10),
      ]),
    );
  } finally {
    await proxy.dispose();
  }
}

export default seed;
