import { afterEach, describe, expect, it, vi } from "vitest";

const { sendGAEvent } = vi.hoisted(() => ({ sendGAEvent: vi.fn() }));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

async function loadTrack(gaId: string) {
  vi.stubEnv("NEXT_PUBLIC_GA_ID", gaId);
  vi.resetModules();
  return (await import("./analytics")).track;
}

afterEach(() => {
  vi.unstubAllEnvs();
  sendGAEvent.mockReset();
});

describe("track", () => {
  it("sends a GA4 event when a measurement ID is configured", async () => {
    const track = await loadTrack("G-TEST");
    track("share", { method: "clipboard" });
    expect(sendGAEvent).toHaveBeenCalledWith("event", "share", { method: "clipboard" });
  });

  it("does nothing without a measurement ID (dev, tests)", async () => {
    const track = await loadTrack("");
    track("share", { method: "clipboard" });
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});
