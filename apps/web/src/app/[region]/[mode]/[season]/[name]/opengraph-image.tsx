import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgCard } from "@/components/og-card";
import { getPlayer } from "@/lib/data/queries";
import { playerCard } from "@/lib/og-card";
import { ogFonts } from "@/lib/og-fonts";
import { parsePlayerParams } from "@/lib/player-params";

export const alt = "hearthgg 플레이어 순위";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function PlayerImage({ params }: { params: Promise<{ region: string; mode: string; season: string; name: string }> }) {
  const parsed = parsePlayerParams(await params);
  if (!parsed) return new Response("Not found", { status: 404 });
  const { board, seasonId, name } = parsed;
  const card = playerCard(board, seasonId, name, await getPlayer(board.region, board.mode, seasonId, name));

  const text = [card.name, card.board, card.rank, ...card.details, card.note, "hearthgg"].join("");
  return new ImageResponse(
    (
      <OgCard eyebrow={card.board} footer={card.note}>
        <div style={{ display: "flex", fontSize: card.name.length > 14 ? 64 : 84, fontWeight: 700, lineHeight: 1.1 }}>{card.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 40, marginTop: 28 }}>
          {card.rank ? <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: OG_COLORS.primary, lineHeight: 1 }}>{card.rank}</div> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 36, color: OG_COLORS.muted }}>
            {card.details.map((detail) => (
              <div key={detail} style={{ display: "flex" }}>
                {detail}
              </div>
            ))}
          </div>
        </div>
      </OgCard>
    ),
    {
      ...size,
      fonts: await ogFonts(text),
      // Ranks move every few minutes; crawlers re-fetching share cards can wait that long.
      headers: { "cache-control": "public, max-age=300, s-maxage=600" },
    },
  );
}
