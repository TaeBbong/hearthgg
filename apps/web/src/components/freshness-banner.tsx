import { Suspense } from "react";
import { getFreshness } from "@/lib/data/queries";
import { FreshnessNotice } from "./freshness-notice";

async function FreshnessData() {
  return <FreshnessNotice {...await getFreshness()} />;
}

/** Streams in after the page shell; never blocks rendering. */
export function FreshnessBanner() {
  return (
    <Suspense fallback={null}>
      <FreshnessData />
    </Suspense>
  );
}
