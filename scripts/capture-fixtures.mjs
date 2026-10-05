// Captures real Blizzard leaderboard responses as test fixtures.
// Metadata blobs (displayMetaData, seasonMetaData) are stripped: they are
// ~300KB per page and unused by the parser.
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("../packages/core/test/fixtures/", import.meta.url);
const BASE = "https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData";
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  accept: "application/json",
};

async function get(params) {
  const url = `${BASE}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const { displayMetaData, seasonMetaData, ...rest } = await res.json();
  return rest;
}

await mkdir(OUT, { recursive: true });

// A full small board (every page) for assembly tests.
const first = await get({ region: "AP", leaderboardId: "wild", page: 1 });
const pages = [first];
for (let page = 2; page <= first.leaderboard.pagination.totalPages; page++) {
  pages.push(await get({ region: "AP", leaderboardId: "wild", page, seasonId: first.seasonId }));
}
await writeFile(new URL("ap-wild-board.json", OUT), JSON.stringify(pages));

// Single pages per rating shape: no rating (standard), decimal (arena), integer (battlegrounds).
for (const mode of ["standard", "arena", "battlegrounds", "undergroundarena"]) {
  await writeFile(new URL(`ap-${mode}-page1.json`, OUT), JSON.stringify(await get({ region: "AP", leaderboardId: mode, page: 1 }), null, 2));
}

// Out-of-range page: Blizzard answers 200 with an empty leaderboard.
await writeFile(new URL("ap-standard-out-of-range.json", OUT), JSON.stringify(await get({ region: "AP", leaderboardId: "standard", page: 9999 }), null, 2));

console.log(`captured ${pages.length} wild pages`);
