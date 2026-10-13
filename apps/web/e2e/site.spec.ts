import { expect, test } from "@playwright/test";

test.describe("site chrome", () => {
  test("centres the logo and the mode menu on the same line", async ({ page }) => {
    await page.goto("/");
    const logo = await page.getByRole("link", { name: "hearthgg 홈" }).getByText("hearthgg").boundingBox();
    const menu = await page.getByRole("navigation", { name: "모드" }).getByRole("link").first().boundingBox();
    const centre = (box: { y: number; height: number } | null) => (box ? box.y + box.height / 2 : NaN);
    expect(Math.abs(centre(logo) - centre(menu))).toBeLessThanOrEqual(1);
  });
});
