import { notFound } from "next/navigation";
import { BoardTabs } from "@/components/board-tabs";
import { parseBoardParams } from "@/lib/routes";

/** Validates region/mode before anything streams, so bad URLs get a real 404 status. */
export default async function BoardLayout({ params, children }: LayoutProps<"/[region]/[mode]">) {
  const board = parseBoardParams(await params);
  if (!board) notFound();

  return (
    <>
      <BoardTabs board={board} />
      {children}
    </>
  );
}
