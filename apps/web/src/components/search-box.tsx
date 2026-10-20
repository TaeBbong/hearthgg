"use client";

import type { SearchHit } from "@hearthgg/core/search";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { track } from "@/lib/analytics";
import { formatRating } from "@/lib/format";
import { MODE_LABEL } from "@/lib/labels";
import { playerHref } from "@/lib/routes";

const DEBOUNCE_MS = 150;

/**
 * Search form with an ARIA combobox: submitting goes to /search (next/form
 * prefetches and navigates client-side); picking a suggestion opens the player.
 */
export function SearchBox({ defaultValue = "", size = "lg" }: { defaultValue?: string; size?: "lg" | "sm" }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inflight = useRef<AbortController>(undefined);

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function requestSuggestions(input: string) {
    clearTimeout(timer.current);
    inflight.current?.abort();
    const query = input.trim();
    if (!query) {
      setHits([]);
      close();
      return;
    }
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      inflight.current = controller;
      try {
        const response = await fetch(`/api/search?${new URLSearchParams({ q: query, limit: "8" })}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { hits: SearchHit[] };
        setHits(data.hits);
        setActive(-1);
        setOpen(data.hits.length > 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") close();
      }
    }, DEBOUNCE_MS);
  }

  function choose(hit: SearchHit) {
    close();
    // Submitted searches land on /search?q=, which GA reports itself as view_search_results.
    track("search", { search_term: value.trim() });
    router.push(playerHref(hit, hit.seasonId, hit.accountId));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (!hits.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setOpen(true);
      setActive((current) => (current + step + hits.length) % hits.length);
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(hits[active]!);
    }
  }

  const large = size === "lg";
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <Form action="/search" role="search" className="relative w-full">
      <div
        className={`flex items-center rounded-full bg-surface shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-primary ${
          large ? "h-14 pl-6 pr-2" : "h-9 pl-4 pr-1"
        }`}
      >
        <input
          name="q"
          type="search"
          role="combobox"
          aria-label="플레이어 검색"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="배틀태그 이름으로 검색 (예: sinah)"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            requestSuggestions(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={close}
          onFocus={() => hits.length > 0 && value.trim() && setOpen(true)}
          className={`min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden ${
            large ? "text-base" : "text-[13px]"
          }`}
        />
        <button
          type="submit"
          aria-label="검색"
          className={`flex shrink-0 items-center justify-center rounded-full font-bold text-primary hover:bg-primary-soft ${
            large ? "size-10 text-lg" : "size-7 text-sm"
          }`}
        >
          <svg viewBox="0 0 24 24" className={large ? "size-5" : "size-4"} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="검색 제안"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg bg-surface py-1 shadow-lg ring-1 ring-border"
      >
        {open
          ? hits.map((hit, index) => (
              <li
                key={`${hit.region}:${hit.mode}:${hit.rank}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(hit)}
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-[13px] ${
                  index === active ? "bg-primary-soft" : "hover:bg-surface-muted"
                }`}
              >
                <span className="w-7 shrink-0 text-[11px] font-bold text-primary">{hit.region}</span>
                <span className="w-16 shrink-0 text-[12px] text-muted">{MODE_LABEL[hit.mode]}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{hit.accountId}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  #{hit.rank}
                  {hit.rating !== null ? ` · ${formatRating(hit.mode, hit.rating)}` : ""}
                </span>
              </li>
            ))
          : null}
      </ul>
    </Form>
  );
}
