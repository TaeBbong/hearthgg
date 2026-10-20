import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgCard } from "@/components/og-card";
import { ogFonts } from "@/lib/og-fonts";

export const alt = "hearthgg - 하스스톤 랭킹 검색";
export const size = OG_SIZE;
export const contentType = "image/png";

const TITLE = "하스스톤 랭킹, 이름만 입력하면 바로";
const BODY = "투기장 · 지하 투기장 · 정규전 · 야생전 · 전장";
const REGIONS = "아시아·태평양 · 아메리카 · 유럽";

/** Default share card for pages without their own (home, leaderboards, search). */
export default async function SiteImage() {
  return new ImageResponse(
    (
      <OgCard eyebrow="hsgg.dev">
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700 }}>{TITLE}</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 38, color: OG_COLORS.muted }}>{BODY}</div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 38, color: OG_COLORS.muted }}>{REGIONS}</div>
      </OgCard>
    ),
    { ...size, fonts: await ogFonts([TITLE, BODY, REGIONS, "hearthgg hsgg.dev"].join("")) },
  );
}
