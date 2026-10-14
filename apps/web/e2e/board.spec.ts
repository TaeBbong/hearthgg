import { expect, test } from "@playwright/test";

test.describe("leaderboard", () => {
  test("paginates the current season", async ({ page }) => {
    await page.goto("/ap/arena");
    await expect(page.getByRole("heading", { name: "아시아·태평양 투기장 랭킹" })).toBeVisible();
    await expect(page.getByText("총 60명")).toBeVisible();

    await page.getByRole("link", { name: "다음 페이지" }).click();
    await expect(page).toHaveURL(/\/ap\/arena\?page=2$/);
    await expect(page.getByRole("row").nth(1)).toContainText("26");
  });

  test("switches to a past season", async ({ page }) => {
    await page.goto("/ap/arena");
    await page.getByRole("combobox", { name: "시즌" }).selectOption("55");
    await expect(page).toHaveURL(/\/ap\/arena\/55$/);
    await expect(page.getByRole("link", { name: "OldChamp" })).toBeVisible();
  });

  test("region and mode tabs navigate between boards", async ({ page }) => {
    await page.goto("/ap/arena");
    await page.getByRole("navigation", { name: "모드" }).last().getByRole("link", { name: "야생전" }).click();
    await expect(page).toHaveURL(/\/ap\/wild$/);
    await expect(page.getByText("총 472명")).toBeVisible();

    await page.getByRole("navigation", { name: "지역" }).getByRole("link", { name: "유럽" }).click();
    await expect(page).toHaveURL(/\/eu\/wild$/);
    await expect(page.getByText("아직 수집된 데이터가 없습니다")).toBeVisible();
  });

  test("unknown boards are a 404", async ({ page }) => {
    const response = await page.goto("/kr/arena");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  });

  test("shows rating cutoffs and movement since the last daily close", async ({ page }) => {
    await page.goto("/ap/arena");
    const cutoffs = page.locator('dl[aria-label="평균 승수 컷"]');
    await expect(cutoffs).toContainText("1위8.00");
    await expect(cutoffs).toContainText("10위7.55");
    await expect(page.getByText("변동: 10월 4일 마감 대비")).toBeVisible();
    const rows = page.getByRole("row");
    await expect(rows.nth(1)).toContainText("변동 없음");
    await expect(rows.nth(2)).toContainText("3계단 상승");
    await expect(rows.nth(3)).toContainText("NEW");
  });

  test("leaves legend boards without cutoffs and boards without a close without movement", async ({ page }) => {
    await page.goto("/eu/standard");
    await expect(page.getByRole("columnheader", { name: "변동" })).toHaveCount(0);
    await expect(page.locator('dl[aria-label$="컷"]')).toHaveCount(0);
  });
});
