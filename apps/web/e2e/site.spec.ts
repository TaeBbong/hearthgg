import { expect, test } from "@playwright/test";

test.describe("site chrome", () => {
  test("centres the logo and the mode menu on the same line", async ({ page }) => {
    await page.goto("/");
    const logo = await page.getByRole("link", { name: "hearthgg 홈" }).getByText("hearthgg").boundingBox();
    const menu = await page.getByRole("navigation", { name: "모드" }).getByRole("link").first().boundingBox();
    const centre = (box: { y: number; height: number } | null) => (box ? box.y + box.height / 2 : NaN);
    expect(Math.abs(centre(logo) - centre(menu))).toBeLessThanOrEqual(1);
  });

  test("links the legal pages from the footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await footer.getByRole("link", { name: "이용약관" }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole("heading", { level: 1, name: "이용약관" })).toBeVisible();

    await footer.getByRole("link", { name: "개인정보처리방침" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeVisible();
  });

  test("serves robots.txt and a sitemap of the leaderboards", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/api\//);
    expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/ap/arena</loc>");
    expect(sitemap).toContain("/eu/battlegrounds</loc>");
    expect(sitemap).toContain("/privacy</loc>");
  });
});
