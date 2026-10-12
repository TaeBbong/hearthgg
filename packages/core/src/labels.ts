import type { Mode } from "./domain";

/** Korean mode names shared by the web UI and crawler notifications. */
export const MODE_LABEL: Record<Mode, string> = {
  arena: "투기장",
  undergroundarena: "지하 투기장",
  standard: "정규전",
  wild: "야생전",
  battlegrounds: "전장",
};
