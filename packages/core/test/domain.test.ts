import { describe, expect, it } from "vitest";
import {
  BOARDS,
  MODES,
  PAGE_SIZE,
  REGIONS,
  boardId,
  isMode,
  isRegion,
  pageOfRank,
  parseBoardId,
  regionFromSlug,
  regionSlug,
} from "../src/domain";

describe("domain", () => {
  it("supports the agreed modes and every region", () => {
    expect(MODES).toEqual(["arena", "undergroundarena", "standard", "wild", "battlegrounds"]);
    expect(REGIONS).toEqual(["US", "EU", "AP"]);
    expect(BOARDS).toHaveLength(MODES.length * REGIONS.length);
  });

  it("guards modes and regions", () => {
    expect(isMode("arena")).toBe(true);
    expect(isMode("twist")).toBe(false);
    expect(isRegion("AP")).toBe(true);
    expect(isRegion("ap")).toBe(false);
  });

  it("maps regions to lowercase URL slugs and back", () => {
    expect(regionSlug("AP")).toBe("ap");
    expect(regionFromSlug("eu")).toBe("EU");
    expect(regionFromSlug("kr")).toBeUndefined();
  });

  it("round-trips a board id", () => {
    const id = boardId({ region: "EU", mode: "wild" });
    expect(id).toBe("EU:wild");
    expect(parseBoardId(id)).toEqual({ region: "EU", mode: "wild" });
    expect(parseBoardId("EU:twist")).toBeUndefined();
  });

  it("finds the page a rank lives on", () => {
    expect(PAGE_SIZE).toBe(25);
    expect(pageOfRank(1)).toBe(1);
    expect(pageOfRank(25)).toBe(1);
    expect(pageOfRank(26)).toBe(2);
  });
});
