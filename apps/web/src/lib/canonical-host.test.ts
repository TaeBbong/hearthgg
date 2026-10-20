import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "./canonical-host";

describe("canonicalRedirect", () => {
  it("moves visitors of the old workers.dev address to the same page on hsgg.dev", () => {
    const response = canonicalRedirect(new Request("https://rank.hsgg.workers.dev/ap/arena/56/sinah?view=daily"));
    expect(response?.status).toBe(301);
    expect(response?.headers.get("location")).toBe("https://hsgg.dev/ap/arena/56/sinah?view=daily");
  });

  it("drops the www prefix", () => {
    const response = canonicalRedirect(new Request("https://www.hsgg.dev/"));
    expect(response?.status).toBe(301);
    expect(response?.headers.get("location")).toBe("https://hsgg.dev/");
  });

  it("serves the canonical host as is", () => {
    expect(canonicalRedirect(new Request("https://hsgg.dev/ap/arena"))).toBeNull();
  });

  it("leaves other hosts alone (local and preview runs)", () => {
    expect(canonicalRedirect(new Request("http://localhost:8787/ap/arena"))).toBeNull();
    expect(canonicalRedirect(new Request("https://abc123-rank.hsgg.workers.dev/"))).toBeNull();
  });
});
