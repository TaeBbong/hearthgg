# hearthgg

하스스톤 리더보드(투기장 · 지하 투기장 · 정규전 · 야생전 · 전장)를 아메리카 · 유럽 · 아시아 전 지역에서 한 번에 검색하는 웹 서비스입니다.
Flutter Web + Flask로 만들었던 [이전 버전](https://github.com/TaeBbong/hearthgg)을 Next.js + Cloudflare 서버리스 구조로 다시 만들었습니다.

## 아키텍처

```
[Cron */5]──▶ crawler Worker: 15개 보드의 1페이지만 조회 → 지문(hash)이 바뀐 보드만 선택
                  │  D1 CAS 잠금 + 전역 동시 크롤 상한(3)
                  ▼
             CrawlBoardWorkflow (보드당 1개, 페이지 50개 단위 step, 시즌 고정)
                  │  무결성 검사 → 불변 스냅샷 R2 저장 → D1 포인터 원자 교체
                  ▼
   R2 snapshots/{region}/{mode}/{season}/{generatedAt}.json   D1 boards (포인터·상태)
   R2 daily/… (일일 원본 보관)                                 D1 rank_history (최근 2시즌)
                  ▲
Next.js (OpenNext on Workers) ── 스냅샷을 isolate LRU에 파싱해 두고 메모리에서 검색
```

- **요청 시점에 Blizzard를 호출하지 않습니다.** 검색은 항상 스냅샷에서 즉시 응답하고, 화면에 "N분 전 기준"을 표시합니다.
- **변경 감지**: Blizzard ETag는 요청마다 달라서 쓸 수 없으므로, 1페이지의 rows와 totalSize를 SHA-256으로 해시합니다.
- **보드 크기별 주기**: 100페이지 이하 5분, 1,000페이지 이하 10분, 2,000페이지 이하 20분, 그보다 크면 30분입니다. 1페이지가 변하지 않아도 1시간마다 다시 수집합니다.
- **레이스 컨디션 방지**: 보드별 잠금(lease 30분), 전역 동시 크롤 상한, "더 새로운 스냅샷만 교체"하는 CAS, 두 버전 보존 후 정리.
- **장애 대응**: 비공식 API 응답을 zod로 검증하고, 실패하면 이전 스냅샷을 유지합니다. 보드별로 연속 실패를 집계해 세 번째에 웹훅으로 한 번 알립니다. 상태는 `/status`와 `/api/status`에서 확인합니다.
- **일일 히스토리**: 5분 cron 중 KST 23:50~24:00 사이 tick이 보드별 마감 순위를 기록합니다(멱등). 동명이인은 날짜별로 가장 가까운 순위를 이어 붙여 추적합니다.

### Cache Components를 끈 이유

Next.js 16의 `cacheComponents`는 OpenNext로 Workers 런타임에서 실행하면 요청이 멈추는 문제가 있습니다([vercel/next.js#94880](https://github.com/vercel/next.js/issues/94880), [opennextjs-cloudflare#1225](https://github.com/opennextjs/opennextjs-cloudflare/issues/1225), [#1369](https://github.com/opennextjs/opennextjs-cloudflare/issues/1369)).
페이지는 이미 `<Suspense>`로 스트리밍하도록 짜여 있어서, 이 문제가 해결되면 `next.config.ts`의 플래그만 켜면 정적 셸 사전 렌더링이 추가됩니다.

## 구조

| 경로 | 내용 |
|---|---|
| `packages/core` | 순수 도메인 로직: Blizzard 클라이언트·검증, 스냅샷 조립·무결성, 변경 감지, 검색, 히스토리 |
| `apps/crawler` | Cron + Workflow Worker (D1/R2 쓰기) |
| `apps/web` | Next.js App Router 앱 (OpenNext로 Workers에 배포, D1/R2 읽기 전용) |
| `migrations` | D1 마이그레이션 (crawler 설정에서 적용) |

## 로컬 개발

Node 22.12 이상과 pnpm 10이 필요합니다(`corepack enable`).

```bash
pnpm install
pnpm --filter crawler db:migrate:local      # 공유 로컬 D1에 마이그레이션 적용
pnpm --filter crawler dev                   # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"   # probe 1회 실행 (실제 Blizzard 호출)
pnpm --filter web dev                       # http://localhost:3000
```

crawler와 web은 같은 로컬 상태(`.wrangler/state`)를 공유하므로, 크롤된 데이터가 그대로 웹에 보입니다.

## 테스트

```bash
pnpm test                                   # core + crawler(workerd) + web 단위 테스트
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e                  # fixture를 시드한 격리 상태에서 E2E
pnpm typecheck && pnpm lint
```

- crawler 테스트는 `@cloudflare/vitest-pool-workers`로 실제 workerd + D1/R2에서 실행되고, Workflow는 introspection API로 검증합니다.
- web 단위 테스트는 Vitest + Testing Library이고, async Server Component는 Next.js 권장대로 Playwright E2E로 검증합니다.

## 배포

```bash
# 1회: 리소스 생성
wrangler r2 bucket create hearthgg-snapshots
wrangler r2 bucket create hearthgg-web-opennext-cache
wrangler d1 create hearthgg       # 출력된 database_id를 두 wrangler.jsonc에 반영

# 마이그레이션과 배포
pnpm --filter crawler exec wrangler d1 migrations apply hearthgg --remote
pnpm --filter crawler exec wrangler secret put ALERT_WEBHOOK_URL   # 선택
pnpm --filter crawler deploy
pnpm --filter web deploy
```

Workflows와 분 단위 Cron을 쓰므로 Workers Paid 플랜($5/월)을 기준으로 합니다.

## 고지

hearthgg는 Blizzard 공식 커뮤니티 리더보드의 공개 데이터를 수집하는 비공식 팬 사이트이며, Blizzard Entertainment와 관련이 없습니다.
