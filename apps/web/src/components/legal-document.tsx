import type { ReactNode } from "react";
import { Card, CardHeader } from "./card";

/** Shell for the terms and privacy pages: a titled card with readable long-form text. */
export function LegalDocument({ title, effectiveDate, children }: { title: string; effectiveDate: string; children: ReactNode }) {
  return (
    <div className="py-6">
      <Card>
        <CardHeader>
          <h1 className="text-base font-bold text-foreground">{title}</h1>
          <span className="text-[12px] text-muted">시행일 {effectiveDate}</span>
        </CardHeader>
        <div className="flex max-w-[760px] flex-col gap-6 break-keep px-4 py-5 text-[13px] leading-relaxed text-foreground/90 [&_a]:text-primary [&_a:hover]:underline [&_li]:ml-4 [&_li]:list-disc [&_ul]:mt-1 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-0.5">
          {children}
        </div>
      </Card>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
