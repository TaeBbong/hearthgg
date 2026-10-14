import { expect, test } from "@playwright/test";

test.describe("player", () => {
  test("shows rank, rating and namesakes on the same board", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await expect(page.getByRole("heading", { level: 1, name: "Sinah" })).toBeVisible();
    await expect(page.getByText("같은 이름의 플레이어가 이 리더보드에 2명 있습니다")).toBeVisible();
    const stats = page.getByRole("definition");
    await expect(stats.filter({ hasText: /^#1$/ })).toBeVisible();
    await expect(stats.filter({ hasText: /^#33$/ })).toBeVisible();
    await expect(stats.filter({ hasText: /^8\.00$/ })).toBeVisible();
  });

  test("summarizes movement since the last close and the best recorded rank per namesake", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    const [first, second] = [page.getByRole("listitem").filter({ hasText: "#1" }).first(), page.getByRole("listitem").filter({ hasText: "#33" }).first()];
    await expect(first.getByText("10월 4일 마감 대비")).toBeVisible();
    await expect(first).toContainText("변동 없음");
    await expect(first).toContainText("최고 순위#1 10월 4일");
    await expect(second).toContainText("1계단 상승");
    await expect(second).toContainText("최고 순위#33 10월 5일");
  });

  test("remembers favorites and recently viewed players on the home page", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await page.getByRole("button", { name: "즐겨찾기" }).click();
    await page.goto("/eu/standard/156/SINAH");
    await page.goto("/");

    const favorites = page.getByRole("region", { name: "즐겨찾기" });
    await expect(favorites.getByRole("link", { name: /Sinah/ })).toHaveAttribute("href", "/ap/arena/56/Sinah");
    const recent = page.getByRole("region", { name: "최근 본 플레이어" });
    await expect(recent.getByRole("link")).toHaveCount(2);
    await expect(recent.getByRole("link").first()).toHaveAttribute("href", "/eu/standard/156/SINAH");

    await favorites.getByRole("button", { name: "Sinah 즐겨찾기 해제" }).click();
    await expect(favorites).toHaveCount(0);
  });

  test("lists the same name on other boards", async ({ page }) => {
    await page.goto("/ap/arena/56/Sinah");
    await page.getByRole("link", { name: /SINAH/ }).click();
    await expect(page).toHaveURL(/\/eu\/standard\/156\/SINAH$/);
  });

  test("jumps to the highlighted row on the leaderboard", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await page.getByRole("link", { name: "랭킹에서 보기" }).nth(1).click();
    await expect(page).toHaveURL(/\/ap\/arena\?page=2&highlight=33#rank-33$/);
    await expect(page.locator("#rank-33")).toHaveAttribute("aria-current", "true");
  });

  test("explains when a name is not ranked", async ({ page }) => {
    await page.goto("/ap/arena/56/nobody-here");
    await expect(page.getByText(/리더보드에서 찾을 수 없습니다/)).toBeVisible();
  });
});

test("theme choice persists across reloads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "다크 모드 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
