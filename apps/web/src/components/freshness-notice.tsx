import { formatKstDateTime } from "@/lib/format";
import { RelativeTime } from "./relative-time";

/** Site-wide notice when shown data is older than usual; silent otherwise. */
export function FreshnessNotice({ blockedUntil, stalledSince }: { blockedUntil: number | null; stalledSince: number | null }) {
  if (!blockedUntil && !stalledSince) return null;

  return (
    <div role="status" className="border-b border-border bg-danger-soft">
      <p className="mx-auto max-w-[1080px] px-4 py-2 text-[13px] text-danger">
        {blockedUntil ? (
          <>
            Blizzard 요청 제한으로 {formatKstDateTime(blockedUntil)}까지 데이터 수집을 멈췄습니다. 그동안은 마지막으로 수집한
            데이터를 보여드립니다.
          </>
        ) : (
          <>
            데이터 갱신이 지연되고 있습니다. 마지막 수집: <RelativeTime time={stalledSince!} />
          </>
        )}
      </p>
    </div>
  );
}
