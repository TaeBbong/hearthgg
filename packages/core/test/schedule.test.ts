import { describe, expect, it } from "vitest";
import { pageFingerprint } from "../src/schedule";
import { parseLeaderboardPage } from "../src/blizzard";
import standardPage from "./fixtures/ap-standard-page1.json";

const page = parseLeaderboardPage(standardPage);

describe("pageFingerprint", () => {
  it("is stable for identical content", async () => {
    expect(await pageFingerprint(page)).toBe(await pageFingerprint(structuredClone(page)));
  });

  it("changes when rows move", async () => {
    const swapped = { ...page, rows: [page.rows[1]!, page.rows[0]!, ...page.rows.slice(2)] };
    expect(await pageFingerprint(swapped)).not.toBe(await pageFingerprint(page));
  });

  it("changes when the board grows even if the top page is unchanged", async () => {
    expect(await pageFingerprint({ ...page, totalSize: page.totalSize + 1 })).not.toBe(await pageFingerprint(page));
  });
});
