import { boardId, type Board } from "@hearthgg/core/domain";
import type { HistoryPoint } from "@hearthgg/core/history";
import { normalizeName } from "@hearthgg/core/normalize";
import { buildSearchIndex, findExact, search, type SearchHit, type SearchIndex, type SearchResult } from "@hearthgg/core/search";
import { deserializeSnapshot, slicePage, type SnapshotRow } from "@hearthgg/core/snapshot";
import type { TtlLru } from "./lru";
import type { BoardPointer, LeaderboardStore } from "./store";

export interface ServiceCaches {
  /** Board pointers change every few minutes; cached briefly under a single key. */
  pointers: TtlLru<"all", BoardPointer[]>;
  /** Parsed snapshots keyed by their immutable object key, so they never go stale. */
  indexes: TtlLru<string, SearchIndex>;
  /** Daily history only changes once a day; keyed by board, season and normalized name. */
  history: TtlLru<string, HistoryPoint[]>;
}

export interface LeaderboardPage {
  pointer: BoardPointer;
  seasonId: number;
  seasons: number[];
  page: number;
  totalPages: number;
  rows: SnapshotRow[];
}

export interface PlayerView {
  pointer: BoardPointer;
  seasonId: number;
  /** Name as Blizzard shows it (first ranked entry), or the requested name if unranked. */
  displayName: string;
  /** Every ranked row with this name; more than one means namesakes. */
  entries: SnapshotRow[];
  /** Exact-name entries on other boards' current seasons. */
  otherBoards: SearchHit[];
}

function isPublished(pointer: BoardPointer): pointer is BoardPointer & { snapshotKey: string; generatedAt: number } {
  return pointer.snapshotKey !== null && pointer.generatedAt !== null;
}

export class LeaderboardService {
  constructor(
    private readonly store: LeaderboardStore,
    private readonly caches: ServiceCaches,
    private readonly now: () => number = Date.now,
  ) {}

  async boards(): Promise<BoardPointer[]> {
    const cached = this.caches.pointers.get("all", this.now());
    if (cached) return cached;
    const pointers = await this.store.listBoards();
    this.caches.pointers.set("all", pointers, this.now());
    return pointers;
  }

  private async index(pointer: BoardPointer): Promise<SearchIndex | null> {
    if (!isPublished(pointer)) return null;
    const cached = this.caches.indexes.get(pointer.snapshotKey, this.now());
    if (cached) return cached;
    const json = await this.store.readSnapshot(pointer.snapshotKey);
    if (json === null) return null;
    const index = buildSearchIndex(deserializeSnapshot(json));
    this.caches.indexes.set(pointer.snapshotKey, index, this.now());
    return index;
  }

  private async currentIndexes(): Promise<Array<{ pointer: BoardPointer; index: SearchIndex }>> {
    const current = (await this.boards()).filter((pointer) => pointer.isCurrent);
    const indexes = await Promise.all(current.map((pointer) => this.index(pointer)));
    return current.flatMap((pointer, i) => {
      const index = indexes[i];
      return index ? [{ pointer, index }] : [];
    });
  }

  private async find(board: Board, seasonId: number | undefined): Promise<{ pointer: BoardPointer; seasons: number[] } | null> {
    const id = boardId(board);
    const forBoard = (await this.boards()).filter((pointer) => isPublished(pointer) && boardId(pointer) === id);
    const pointer = forBoard.find((p) => (seasonId === undefined ? p.isCurrent : p.seasonId === seasonId));
    if (!pointer) return null;
    const seasons = forBoard.map((p) => p.seasonId).toSorted((a, b) => b - a);
    return { pointer, seasons };
  }

  async search(query: string, limit = 50): Promise<SearchResult> {
    return search((await this.currentIndexes()).map(({ index }) => index), query, { limit });
  }

  async leaderboard(board: Board, seasonId: number | undefined, page: number): Promise<LeaderboardPage | null> {
    const found = await this.find(board, seasonId);
    const index = found && (await this.index(found.pointer));
    if (!found || !index) return null;
    const slice = slicePage(index.snapshot, page);
    return { pointer: found.pointer, seasonId: found.pointer.seasonId, seasons: found.seasons, ...slice };
  }

  async player(board: Board, seasonId: number, name: string): Promise<PlayerView | null> {
    const found = await this.find(board, seasonId);
    const index = found && (await this.index(found.pointer));
    if (!found || !index) return null;

    const entries = findExact(index, name);
    const id = boardId(board);
    const { hits } = await this.search(name, 200);
    const otherBoards = hits.filter((hit) => hit.match === "exact" && boardId(hit) !== id);
    return { pointer: found.pointer, seasonId, displayName: entries[0]?.[1] ?? name, entries, otherBoards };
  }

  /** Current boards with their top `limit` rows, for the home page. */
  async overview(limit = 3): Promise<Array<{ pointer: BoardPointer; top: SnapshotRow[] }>> {
    return (await this.currentIndexes()).map(({ pointer, index }) => ({ pointer, top: index.snapshot.rows.slice(0, limit) }));
  }

  async history(board: Board, seasonId: number, name: string): Promise<HistoryPoint[]> {
    const normalized = normalizeName(name);
    const key = `${boardId(board)}:${seasonId}:${normalized}`;
    const cached = this.caches.history.get(key, this.now());
    if (cached) return cached;
    const points = await this.store.readHistory(board, seasonId, normalized);
    this.caches.history.set(key, points, this.now());
    return points;
  }

  async status(): Promise<BoardPointer[]> {
    return (await this.boards()).filter((pointer) => pointer.isCurrent);
  }
}
