import { expect, test } from "@playwright/test";

test.describe("data freshness", () => {
  test("warns on every page when collection has stalled", async ({ page }) => {
    // Seeded data is far older than an hour.
    for (const path of ["/", "/ap/arena", "/search?q=sinah"]) {
      await page.goto(path);
      await expect(page.getByText(/데이터 갱신이 지연되고 있습니다/)).toBeVisible();
    }
  });

  test("labels ranks below the top 1,000 with their own collection time", async ({ page }) => {
    await page.goto("/ap/battlegrounds");
    await expect(page.getByText("1,001위 이하")).toHaveCount(0);
    await page.goto("/ap/battlegrounds?page=41");
    await expect(page.getByText(/1,001위 이하/)).toBeVisible();
  });
});
