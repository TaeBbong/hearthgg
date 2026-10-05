import { MODES } from "@hearthgg/core/domain";
import Link from "next/link";
import { Suspense } from "react";
import { MODE_LABEL } from "@/lib/labels";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-header text-header-foreground shadow-sm">
      <div className="mx-auto flex h-12 max-w-[1080px] items-center gap-4 px-4">
        <Link href="/" className="shrink-0" aria-label="hearthgg 홈">
          <Logo />
        </Link>
        <nav aria-label="모드" className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {MODES.map((mode) => (
            <Link
              key={mode}
              href={`/ap/${mode}`}
              className="whitespace-nowrap rounded px-2.5 py-1.5 text-[13px] font-medium text-header-foreground/85 hover:bg-white/15 hover:text-header-foreground"
            >
              {MODE_LABEL[mode]}
            </Link>
          ))}
        </nav>
        <div className="hidden w-64 shrink-0 md:block">
          <Suspense fallback={<div className="h-9" />}>
            <HeaderSearch />
          </Suspense>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
