import { boardId, isMode, isRegion, type Mode, type Region } from "@hearthgg/core/domain";
import { normalizeName } from "@hearthgg/core/normalize";

/**
 * Favorites and recently viewed players, kept only in this browser
 * (no accounts). The season is not stored: links follow the current one.
 */
export interface SavedPlayer {
  region: Region;
  mode: Mode;
  name: string;
}

export interface Saved {
  favorites: SavedPlayer[];
  recent: SavedPlayer[];
}

export const MAX_FAVORITES = 20;
export const MAX_RECENT = 8;
const KEYS = { favorites: "hearthgg:favorites", recent: "hearthgg:recent" } as const;
/** Same-tab writes do not fire `storage`, so subscribers also listen for this. */
const CHANGE_EVENT = "hearthgg:saved-players";

const keyOf = (player: SavedPlayer) => `${boardId(player)}:${normalizeName(player.name)}`;
const same = (a: SavedPlayer) => (b: SavedPlayer) => keyOf(a) === keyOf(b);

function read(key: string): SavedPlayer[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) =>
      item && typeof item.name === "string" && isRegion(item.region) && isMode(item.mode)
        ? [{ region: item.region, mode: item.mode, name: item.name }]
        : [],
    );
  } catch {
    return [];
  }
}

function write(key: string, players: SavedPlayer[]) {
  try {
    localStorage.setItem(key, JSON.stringify(players));
  } catch {
    // Storage unavailable (private mode, quota): the list just isn't remembered.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

let cache: { raw: string; value: Saved } | null = null;

/** Stable snapshot for useSyncExternalStore: the same object until storage changes. */
export function readSaved(): Saved {
  let raw = "";
  try {
    raw = `${localStorage.getItem(KEYS.favorites)}|${localStorage.getItem(KEYS.recent)}`;
  } catch {
    // Fall through with empty lists.
  }
  if (cache?.raw !== raw) cache = { raw, value: { favorites: read(KEYS.favorites), recent: read(KEYS.recent) } };
  return cache.value;
}

export const EMPTY_SAVED: Saved = { favorites: [], recent: [] };

export function subscribeSaved(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function isFavorite(favorites: readonly SavedPlayer[], player: SavedPlayer): boolean {
  return favorites.some(same(player));
}

export function toggleFavorite(player: SavedPlayer) {
  const favorites = read(KEYS.favorites);
  write(
    KEYS.favorites,
    isFavorite(favorites, player) ? favorites.filter((p) => !same(player)(p)) : [...favorites, player].slice(-MAX_FAVORITES),
  );
}

export function addRecent(player: SavedPlayer) {
  write(KEYS.recent, [player, ...read(KEYS.recent).filter((p) => !same(player)(p))].slice(0, MAX_RECENT));
}

export function removeRecent(player: SavedPlayer) {
  write(KEYS.recent, read(KEYS.recent).filter((p) => !same(player)(p)));
}

export function clearRecent() {
  write(KEYS.recent, []);
}
