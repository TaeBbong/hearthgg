import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-2 px-4 py-6 text-[12px] leading-relaxed text-muted">
        <p>
          hearthgg는 Blizzard 공식 커뮤니티 리더보드의 공개 데이터를 주기적으로 수집해 검색할 수 있게 보여주는 비공식 팬
          사이트입니다. Blizzard Entertainment와 관련이 없으며, 하스스톤®은 Blizzard Entertainment의 상표입니다.
        </p>
        <p className="flex gap-3">
          <Link href="/status" className="hover:text-foreground hover:underline">
            데이터 수집 상태
          </Link>
          <a href="https://github.com/TaeBbong/hearthgg" className="hover:text-foreground hover:underline">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
