import { parsePositiveInt } from "@/components/board-view";
import { parseBoardParams } from "./routes";

/**
 * BattleTag names are at most 12 characters; the margin covers other upstream naming.
 * Longer names cannot be ranked, and each one would otherwise render a fresh share image.
 */
export const MAX_NAME_LENGTH = 32;

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
  const name = decodeName(params.name);
  if (!board || !seasonId || name.length > MAX_NAME_LENGTH) return null;
  return { board, seasonId, name };
}
