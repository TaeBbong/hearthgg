import { searchPlayers } from "@/lib/data/queries";

const MAX_QUERY_LENGTH = 50;
const MAX_LIMIT = 20;

/** Autocomplete endpoint for the search box. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const limit = Math.min(Math.max(Number(params.get("limit")) || 8, 1), MAX_LIMIT);

  const result = query ? await searchPlayers(query, limit) : { hits: [], total: 0 };
  return Response.json(result, {
    // Snapshots refresh every few minutes; a short shared cache absorbs keystroke bursts.
    headers: { "cache-control": "public, max-age=15, s-maxage=60" },
  });
}
