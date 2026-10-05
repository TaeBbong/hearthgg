import { notFound } from "next/navigation";
import { parsePositiveInt } from "@/components/board-view";

/** Rejects non-numeric seasons with a real 404 before the page streams. */
export default async function SeasonLayout({ params, children }: LayoutProps<"/[region]/[mode]/[season]">) {
  if (!parsePositiveInt((await params).season)) notFound();
  return children;
}
