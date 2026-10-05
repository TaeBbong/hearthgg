import type { Mode, Region } from "@hearthgg/core/domain";

export const MODE_LABEL: Record<Mode, string> = {
  arena: "투기장",
  undergroundarena: "지하 투기장",
  standard: "정규전",
  wild: "야생전",
  battlegrounds: "전장",
};

/** Column header for the rating value; standard/wild legend boards have none. */
export const RATING_LABEL: Record<Mode, string | null> = {
  arena: "평균 승수",
  undergroundarena: "레이팅",
  standard: null,
  wild: null,
  battlegrounds: "레이팅",
};

export const REGION_LABEL: Record<Region, string> = {
  US: "아메리카",
  EU: "유럽",
  AP: "아시아·태평양",
};

export function seasonLabel(seasonId: number): string {
  return `시즌 ${seasonId}`;
}
