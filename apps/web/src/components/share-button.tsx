"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const NOTICE_MS = 2_500;

/**
 * Shares the current page: the system share sheet where the browser has one
 * (mobile, some desktops), otherwise the link goes to the clipboard.
 */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function announce(message: string) {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), NOTICE_MS);
  }

  async function share() {
    const url = `${location.origin}${location.pathname}`;
    const data = { title, text, url };
    const shared = (method: string) => track("share", { method, content_type: "player", item_id: location.pathname });
    if (navigator.share && navigator.canShare?.(data) !== false) {
      try {
        await navigator.share(data);
        shared("share_sheet");
        return;
      } catch (error) {
        // Dismissing the sheet is not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      shared("clipboard");
      announce("링크를 복사했습니다");
    } catch {
      announce("복사하지 못했습니다. 주소창의 링크를 복사해 주세요");
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[12px] font-semibold text-muted hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        공유
      </button>
      <span
        role="status"
        className="pointer-events-none absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[12px] text-surface empty:hidden"
      >
        {notice}
      </span>
    </span>
  );
}
