import type { ReactNode } from "react";

/** Brand colours for share images (light theme; Satori has no CSS variables). */
const COLORS = { primary: "#5383e8", foreground: "#202d37", muted: "#758592", surface: "#ffffff", band: "#5383e8" };
export const OG_SIZE = { width: 1200, height: 630 };

/** 1200×630 share card: brand band on top, content below. Satori layout (flex only). */
export function OgCard({ eyebrow, children, footer }: { eyebrow: string; children: ReactNode; footer?: string | null }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: COLORS.surface, fontFamily: "Noto Sans KR" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 120, padding: "0 64px", background: COLORS.band, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 48, fontWeight: 800 }}>
          <svg viewBox="0 0 24 24" width={44} height={44}>
            <path
              fill="#fff"
              d="M12 2c.6 3.1-1.3 4.9-2.9 6.6C7.5 10.3 6 11.9 6 14.6A6 6 0 0 0 18 14.6c0-2.3-1-4-2.2-5.2.1 1.6-.6 2.8-1.6 3.3.3-2.6-.4-6.9-2.2-10.7Z"
            />
          </svg>
          hearthgg
        </div>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.9 }}>{eyebrow}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 64px", color: COLORS.foreground }}>
        {children}
      </div>
      {footer ? <div style={{ display: "flex", padding: "0 64px 44px", fontSize: 26, color: COLORS.muted }}>{footer}</div> : null}
    </div>
  );
}

export const OG_COLORS = COLORS;
