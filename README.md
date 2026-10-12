# hearthgg

하스스톤 리더보드(투기장 · 지하 투기장 · 정규전 · 야생전 · 전장)를 아메리카 · 유럽 · 아시아 전 지역에서 한 번에 검색하는 웹 서비스입니다.
Flutter Web + Flask로 만들었던 [이전 버전](https://github.com/TaeBbong/hearthgg/tree/v1-flutter)을 Next.js + Cloudflare 서버리스 구조로 다시 만들었습니다.

## 아키텍처

```
[Cron */5]──▶ crawler Worker: 15개 보드의 1페이지만 조회 → 갱신할 보드와 범위(상위/전체) 선택
                  │  D1 CAS 잠금 · 요청 예산(토큰 버킷) · 동시 크롤 상한 · 403/429 서킷 브레이커
                  ▼
             CrawlBoardWorkflow (보드당 1개, 50페이지 단위로 예산 예약 → 수집, 시즌 고정)
                  │  무결성 검사 → 불변 스냅샷 R2 저장 → D1 포인터 원자 교체
                  ▼
   R2 snapshots/{region}/{mode}/{season}/{generatedAt}.json   D1 boards (포인터·상태)
   R2 daily/… (일일 원본 보관)                                 D1 rank_history (최근 2시즌)
                  ▲
Next.js (OpenNext on Workers) ── 스냅샷을 isolate LRU에 파싱해 두고 메모리에서 검색
```

- **요청 시점에 Blizzard를 호출하지 않습니다.** 검색은 항상 스냅샷에서 즉시 응답하고, 화면에 "N분 전 기준"을 표시합니다.
- **변경 감지**: Blizzard ETag는 요청마다 달라서 쓸 수 없으므로, 1페이지의 rows와 totalSize를 SHA-256으로 해시합니다.
- **구간별 갱신**: 상위 40페이지(1~1,000위)는 1페이지가 바뀌면 최소 10분 간격으로 다시 읽고, 바뀌지 않아도 60분마다 읽습니다. 보드 전체는 2시간마다 읽습니다. 상위만 읽었을 때는 직전 스냅샷의 1,001위 이하와 합치고, 그 구간의 기준 시각을 따로 표시합니다. 갱신 순서는 "목표 주기 대비 얼마나 늦었는지"로 정해서 전체 갱신이 밀리지 않게 합니다.
- **레이스 컨디션 방지**: 보드별 잠금(lease 30분), 전역 동시 크롤 상한, "더 새로운 스냅샷만 교체"하는 CAS, 두 버전 보존 후 정리.
- **업스트림 보호** (값은 `apps/crawler/src/limits.ts`): 개발 중 동시 요청 약 90개로 크롤했다가 IP가 403으로 차단된 경험에서 나온 장치들입니다.
  - **요청 예산**: 모든 probe와 크롤이 D1 토큰 버킷 하나를 공유합니다(시간당 3,000건, 최대 600건까지 몰아 쓰기 가능). 크롤은 50페이지마다 토큰을 예약하고, 부족하면 Workflow `step.sleep`으로 기다립니다.
  - **동시성**: 동시 크롤 최대 2개, 크롤당 동시 요청 3개, probe 동시 요청 2개입니다.
  - **서킷 브레이커**: 403이나 429를 한 번이라도 받으면 모든 요청을 멈춥니다. 연속으로 차단되면 대기 시간이 30분 → 1시간 → 2시간…으로 늘고(최대 6시간), 풀린 뒤에도 strike당 처리량을 절반으로 줄였다가 6시간 무사고마다 한 단계씩 회복합니다.
  - 차단을 IP 변경이나 프록시로 우회하지 않습니다.
- **장애 대응**: 비공식 API 응답을 zod로 검증하고, 실패하면 이전 스냅샷을 유지합니다. 차단 중이거나 1시간 넘게 갱신이 없으면 모든 페이지 상단에 안내를 띄웁니다. 상태는 `/status`와 `/api/status`에서 확인합니다.
- **Discord 알림** (`ALERT_WEBHOOK_URL` secret):
  - 장애: 한 보드가 3번 연속 실패했을 때, 블리자드 차단이 시작됐을 때 한 번씩 보냅니다.
  - 복구: 그 보드가 다시 게시됐을 때, 차단이 풀린 뒤 첫 요청이 성공했을 때 보냅니다.
  - 일일 리포트: 매일 23:50(KST)에 보드별 상태(정상/지연/실패/수집 전), 그날 기록한 순위 수, 차단 상태를 보냅니다.
  - Workflow 안의 알림은 `step.do` 안에서 보내므로 replay 때 중복되지 않습니다.
  - 크롤러 자체가 멈추면 알림도 멈춥니다. 매일 리포트가 오는지로 확인합니다.
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

Node 22.12 이상이면 됩니다. 패키지 관리는 Node에 포함된 npm(workspaces)을 씁니다.

```bash
npm install
npm run db:migrate:local -w crawler        # 공유 로컬 D1에 마이그레이션 적용
npm run dev -w crawler                     # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"   # probe 1회 실행 (실제 Blizzard 호출)
npm run dev -w web                         # http://localhost:3000
```

crawler와 web은 같은 로컬 상태(`.wrangler/state`)를 공유하므로, 크롤된 데이터가 그대로 웹에 보입니다.

> `.npmrc`의 `legacy-peer-deps=true`는 npm 11.6 미만에서 vitest 4의 optional peer를 해석하다 생기는 크래시("reading 'edgesOut'")를 피하기 위한 설정입니다. 필요한 peer는 모두 직접 선언되어 있습니다.

## 테스트

```bash
npm test                                   # core + crawler(workerd) + web 단위 테스트
npx playwright install chromium
npm run test:e2e -w web                    # fixture를 시드한 격리 상태에서 E2E
npm run typecheck && npm run lint
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
npm exec -w crawler -- wrangler d1 migrations apply hearthgg --remote
npm exec -w crawler -- wrangler secret put ALERT_WEBHOOK_URL   # 선택
npm run deploy -w crawler
npm run deploy -w web
```

Workflows와 분 단위 Cron을 쓰므로 Workers Paid 플랜($5/월)을 기준으로 합니다.

## 고지

hearthgg는 Blizzard 공식 커뮤니티 리더보드의 공개 데이터를 수집하는 비공식 팬 사이트이며, Blizzard Entertainment와 관련이 없습니다.
