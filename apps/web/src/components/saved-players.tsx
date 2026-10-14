"use client";

import { boardId, type BoardId } from "@hearthgg/core/domain";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { playerHref, searchHref } from "@/lib/routes";
import {
  EMPTY_SAVED,
  addRecent,
  clearRecent,
  isFavorite,
  readSaved,
  removeRecent,
  subscribeSaved,
  toggleFavorite,
  type SavedPlayer,
} from "@/lib/saved-players";
import { ModeBadge, RegionBadge } from "./badges";

/** Server render and hydration see empty lists; the stored ones appear right after. */
function useSaved() {
  return useSyncExternalStore(subscribeSaved, readSaved, () => EMPTY_SAVED);
}

export function FavoriteButton({ player }: { player: SavedPlayer }) {
  const { favorites } = useSaved();
  const on = isFavorite(favorites, player);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggleFavorite(player)}
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] font-semibold ${
        on ? "border-rank-1 text-rank-1" : "border-border text-muted hover:text-foreground"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinejoin="round" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" />
      </svg>
      즐겨찾기
    </button>
  );
}

/** Remembers a viewed player; renders nothing. */
export function RecordVisit({ player }: { player: SavedPlayer }) {
  const { region, mode, name } = player;
  useEffect(() => addRecent({ region, mode, name }), [region, mode, name]);
  return null;
}

function PlayerLinks({
  title,
  players,
  currentSeasons,
  onRemove,
  removeLabel,
  onClear,
}: {
  title: string;
  players: readonly SavedPlayer[];
  currentSeasons: Partial<Record<BoardId, number>>;
  onRemove: (player: SavedPlayer) => void;
  /** Accessible name of each remove button. */
  removeLabel: string;
  onClear?: () => void;
}) {
  if (!players.length) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px]">
        <h2 className="font-semibold text-muted">{title}</h2>
        {onClear ? (
          <button type="button" onClick={onClear} className="text-subtle hover:text-foreground">
            모두 지우기
          </button>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-2">
        {players.map((player) => {
          const seasonId = currentSeasons[boardId(player)];
          return (
            <li key={`${boardId(player)}:${player.name}`} className="flex items-center rounded-full bg-surface ring-1 ring-border">
              <Link
                href={seasonId ? playerHref(player, seasonId, player.name) : searchHref(player.name)}
                className="flex items-center gap-1.5 py-1 pl-1.5 pr-3 text-[13px] font-medium text-foreground hover:text-primary"
              >
                <RegionBadge region={player.region} />
                <ModeBadge mode={player.mode} />
                {player.name}
              </Link>
              <button
                type="button"
                onClick={() => onRemove(player)}
                aria-label={`${player.name} ${removeLabel}`}
                className="-ml-1.5 mr-1 flex size-6 items-center justify-center rounded-full text-subtle hover:bg-surface-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Home shortcuts to favorite and recently viewed players, linked to each board's current season. */
export function SavedPlayers({ currentSeasons }: { currentSeasons: Partial<Record<BoardId, number>> }) {
  const { favorites, recent } = useSaved();
  if (!favorites.length && !recent.length) return null;
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4">
      <PlayerLinks title="즐겨찾기" players={favorites} currentSeasons={currentSeasons} onRemove={toggleFavorite} removeLabel="즐겨찾기 해제" />
      <PlayerLinks
        title="최근 본 플레이어"
        players={recent}
        currentSeasons={currentSeasons}
        onRemove={removeRecent}
        removeLabel="기록 삭제"
        onClear={clearRecent}
      />
    </div>
  );
}
