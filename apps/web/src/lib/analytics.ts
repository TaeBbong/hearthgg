import { sendGAEvent } from "@next/third-parties/google";
import { GA_ID } from "./site";

/** Sends a GA4 event; a no-op where GA isn't loaded, so callers never check. */
export function track(name: string, params: Record<string, string>) {
  if (GA_ID) sendGAEvent("event", name, params);
}
