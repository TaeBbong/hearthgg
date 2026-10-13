import Link from "next/link";
import { CONTACT_URL } from "@/lib/site";

const LINK = "hover:text-foreground hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 py-6 text-[12px] leading-relaxed text-muted">
        <nav aria-label="사이트 정보" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/terms" className={LINK}>
            이용약관
          </Link>
          {/* Shown in bold, as Korean privacy guidelines ask for the privacy policy link. */}
          <Link href="/privacy" className={`font-bold text-foreground/80 ${LINK}`}>
            개인정보처리방침
          </Link>
          <Link href="/status" className={LINK}>
            데이터 수집 상태
          </Link>
          <a href={CONTACT_URL} className={LINK}>
            문의
          </a>
          <a href="https://github.com/TaeBbong/hearthgg" className={LINK}>
            GitHub
          </a>
        </nav>
        {/* One sentence per line; on narrow screens keep-all + balance wrap at word boundaries into even lines. */}
        <div className="break-keep text-balance">
          <p>hearthgg는 Blizzard 공식 커뮤니티 리더보드의 공개 데이터를 모아 보여주는 비공식 팬 사이트입니다.</p>
          <p>
            Blizzard Entertainment와 관련이 없으며, <span className="whitespace-nowrap">하스스톤®은</span> Blizzard
            Entertainment의 상표입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
