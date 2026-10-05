"use client";

import { useSyncExternalStore } from "react";
import { formatKstDateTime, formatRelative } from "@/lib/format";

const TICK_MS = 30_000;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), TICK_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

// Bucketed so repeated reads within one tick return the same snapshot.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
// The server cannot know the viewer's clock: render absolute time, then switch after hydration.
const getServerSnapshot = () => null;

export function RelativeTime({ time }: { time: number }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const absolute = formatKstDateTime(time);

  return (
    <time dateTime={new Date(time).toISOString()} title={absolute}>
      {now === null ? absolute : formatRelative(time, now)}
    </time>
  );
}
