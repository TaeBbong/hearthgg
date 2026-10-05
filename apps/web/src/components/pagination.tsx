import Link from "next/link";

type PageItem = number | "gap";

/** First, last and two pages either side of the current one, with gaps elided. */
export function pageWindow(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages]);
  for (let candidate = page - 2; candidate <= page + 2; candidate++) {
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }
  const sorted = [...pages].toSorted((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1]! > 1 ? ["gap" as const, value] : [value]));
}

const itemClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-[13px] font-medium tabular-nums transition-colors";

export function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-1 py-4">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="이전 페이지" className={`${itemClass} text-muted hover:bg-surface-muted`}>
          ‹
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className={`${itemClass} text-subtle`} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${itemClass} ${
              item === page ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="다음 페이지" className={`${itemClass} text-muted hover:bg-surface-muted`}>
          ›
        </Link>
      ) : null}
    </nav>
  );
}
