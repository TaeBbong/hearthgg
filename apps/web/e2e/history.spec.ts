import { expect, test } from "@playwright/test";

test.describe("rank history", () => {
  test("draws one traced trend per namesake", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await expect(page.getByRole("heading", { name: "순위 추이" })).toBeVisible();
    await expect(page.getByText("현재 #1 플레이어")).toBeVisible();
    await expect(page.getByText("현재 #33 플레이어")).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 1일부터 10월 5일까지 순위 5위에서 1위" })).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 1일부터 10월 5일까지 순위 40위에서 33위" })).toBeVisible();
  });

  test("keyboard users can read each day's value", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    const plot = page.getByRole("group", { name: "날짜별 순위 탐색" }).first();
    await plot.focus();
    await expect(page.getByRole("status")).toContainText("#1");
    await plot.press("ArrowLeft");
    await plot.press("ArrowLeft");
    await plot.press("ArrowLeft");
    await expect(page.getByRole("status")).toContainText("#3");
    await expect(page.getByRole("status")).toContainText("10월 2일");
  });

  test("players without history see why the chart is empty", async ({ page }) => {
    await page.goto("/eu/standard/156/SINAH");
    await expect(page.getByText(/기록이 쌓이는 중입니다/)).toBeVisible();
  });
});
