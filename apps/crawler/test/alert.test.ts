import { describe, expect, it } from "vitest";
import { createAlert } from "../src/alert";

describe("createAlert", () => {
  it("posts the message without letting its text ping anyone", async () => {
    const bodies: unknown[] = [];
    const alert = createAlert("https://discord.test/api/webhooks/1/token", async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 204 });
    });

    await alert("⚠️ AP:arena 연속 실패 3회: @everyone");

    expect(bodies).toEqual([{ content: "⚠️ AP:arena 연속 실패 3회: @everyone", allowed_mentions: { parse: [] } }]);
  });
});
