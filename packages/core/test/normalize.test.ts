import { describe, expect, it } from "vitest";
import { normalizeName } from "../src/normalize";

describe("normalizeName", () => {
  it("ignores case", () => {
    expect(normalizeName("SinAh")).toBe("sinah");
  });

  it("folds full-width and compatibility characters (NFKC)", () => {
    expect(normalizeName("ＡＢＣ１")).toBe("abc1");
  });

  it("composes decomposed Hangul so it matches typed input", () => {
    const decomposed = "하스"; // 하스 as conjoining jamo
    expect(normalizeName(decomposed)).toBe(normalizeName("하스"));
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeName("  name ")).toBe("name");
  });
});
