import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { FreshnessBanner } from "@/components/freshness-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { THEME_SCRIPT } from "@/components/theme-toggle";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "hearthgg - 하스스톤 랭킹 검색", template: "%s | hearthgg" },
  description: "투기장, 지하 투기장, 정규전, 야생전, 전장 리더보드를 전 지역에서 한 번에 검색하세요.",
  openGraph: { siteName: "hearthgg", locale: "ko_KR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5383e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script adds `dark` before paint, so <html> differs from the server render.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <FreshnessBanner />
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
