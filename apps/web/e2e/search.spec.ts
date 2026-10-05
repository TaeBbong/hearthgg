import { expect, test } from "@playwright/test";

test.describe("search", () => {
  test("home shows each mode's #1 per region", async ({ page }) => {
    await page.goto("/");
    const arena = page.locator("section").filter({ has: page.getByRole("heading", { name: "투기장", exact: true }) });
    await expect(arena.getByRole("link", { name: "Sinah" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "정규전" })).toBeVisible();
  });

  test("autocomplete suggests players and opens the chosen one", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("combobox", { name: "플레이어 검색" }).first();
    await input.fill("sinah");

    const options = page.getByRole("option");
    await expect(options.first()).toContainText("Sinah");
    await input.press("ArrowDown");
    await input.press("Enter");

    await expect(page).toHaveURL(/\/ap\/arena\/56\/Sinah$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sinah" })).toBeVisible();
  });

  test("submitting shows grouped results that can be filtered by mode", async ({ page, isMobile }) => {
    await page.goto("/search?q=sinah");
    await expect(page.getByRole("heading", { name: /“sinah” 검색 결과 4건/ })).toBeVisible();
    // The badge is dropped on narrow screens, where exact matches still sort first.
    if (!isMobile) await expect(page.getByText("정확히 일치").first()).toBeVisible();

    await page.getByRole("navigation", { name: "모드 필터" }).getByRole("link", { name: /정규전/ }).click();
    await expect(page).toHaveURL(/mode=standard/);
    await expect(page.getByRole("link", { name: /sinahfan/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Other/ })).toHaveCount(0);
  });

  test("an unknown name says so", async ({ page }) => {
    await page.goto("/search?q=zzzz-nobody");
    await expect(page.getByText("일치하는 플레이어가 없습니다")).toBeVisible();
  });
});
