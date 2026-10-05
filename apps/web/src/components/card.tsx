import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-md bg-surface ring-1 ring-border ${className}`}>{children}</section>;
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 ${className}`}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-14 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children ? <div className="text-[13px] text-muted">{children}</div> : null}
    </div>
  );
}

/** Pulsing placeholder rows for Suspense fallbacks. */
export function SkeletonRows({ rows = 10 }: { rows?: number }) {
  return (
    <div className="animate-pulse divide-y divide-border-subtle" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <div className="h-3 w-8 rounded bg-surface-muted" />
          <div className="h-3 flex-1 rounded bg-surface-muted" />
          <div className="h-3 w-14 rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
