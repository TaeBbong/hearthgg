import { parsePositiveInt } from "@/components/board-view";
import { parseBoardParams } from "./routes";

/** Segments arrive percent-encoded; a stray "%" in a name must not crash the page. */
function decodeName(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Board, season and name of a player URL, or null when any segment is invalid. */
export function parsePlayerParams(params: { region: string; mode: string; season: string; name: string }) {
  const board = parseBoardParams(params);
  const seasonId = parsePositiveInt(params.season);
  if (!board || !seasonId) return null;
  return { board, seasonId, name: decodeName(params.name) };
}
