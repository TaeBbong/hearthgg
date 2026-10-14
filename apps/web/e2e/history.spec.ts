import { expect, test } from "@playwright/test";

test.describe("rank history", () => {
  test("shows every recorded change per namesake, up to the latest snapshot", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await expect(page.getByRole("heading", { name: "순위 추이" })).toBeVisible();
    await expect(page.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("현재 #1 플레이어")).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 5일 13:00부터 10월 5일 15:00까지 순위 3위에서 1위" })).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 5일 13:00부터 10월 5일 15:00까지 순위 36위에서 33위" })).toBeVisible();

    const plot = page.getByRole("group", { name: "시점별 순위 탐색" }).first();
    const tooltip = page.getByRole("status", { name: "선택한 시점의 순위" });
    await plot.focus();
    await plot.press("ArrowLeft");
    await expect(tooltip).toContainText("#1");
    await expect(tooltip).toContainText("10월 5일 14:20");
  });

  test("switches to one traced closing rank per day", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await page.getByRole("button", { name: "일별" }).click();
    await expect(page.getByText("매일 23:50(KST) 마감 순위")).toBeVisible();
    await expect(page.getByText("현재 #33 플레이어")).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 1일부터 10월 5일까지 순위 5위에서 1위" })).toBeVisible();
    await expect(page.getByRole("img", { name: "10월 1일부터 10월 5일까지 순위 40위에서 33위" })).toBeVisible();
  });

  test("keyboard users can read each day's value", async ({ page }) => {
    await page.goto("/ap/arena/56/sinah");
    await page.getByRole("button", { name: "일별" }).click();
    const plot = page.getByRole("group", { name: "날짜별 순위 탐색" }).first();
    const tooltip = page.getByRole("status", { name: "선택한 날짜의 순위" });
    await plot.focus();
    await expect(tooltip).toContainText("#1");
    await plot.press("ArrowLeft");
    await plot.press("ArrowLeft");
    await plot.press("ArrowLeft");
    await expect(tooltip).toContainText("#3");
    await expect(tooltip).toContainText("10월 2일");
  });

  test("players without history see why each chart is empty", async ({ page }) => {
    await page.goto("/eu/standard/156/SINAH");
    await expect(page.getByText(/아직 기록된 순위 변화가 없습니다/)).toBeVisible();
    await page.getByRole("button", { name: "일별" }).click();
    await expect(page.getByText(/기록이 쌓이는 중입니다/)).toBeVisible();
  });
});
