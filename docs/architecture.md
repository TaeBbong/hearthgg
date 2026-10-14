# hearthgg 설계 문서

README가 서비스 소개라면, 이 문서는 "왜 이렇게 만들었는지"를 남기는 개발자용 기록입니다.

## 전체 구조

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

| 경로 | 내용 |
|---|---|
| `packages/core` | 런타임에 의존하지 않는 도메인 로직: Blizzard 클라이언트·검증, 스냅샷 조립·병합·무결성, 갱신 판단, 검색, 히스토리 |
| `apps/crawler` | Cron + Workflow Worker. D1/R2에 쓰는 유일한 주체 |
| `apps/web` | Next.js App Router 앱. OpenNext로 Workers에 배포, D1/R2는 읽기만 함 |
| `migrations` | D1 마이그레이션 (crawler 설정에서 적용) |

## 수집 파이프라인

- **요청 시점에 Blizzard를 호출하지 않습니다.** 검색은 항상 스냅샷에서 응답하고, 화면에 "N분 전 기준"을 표시합니다.
- **변경 감지**: Blizzard ETag는 같은 내용에도 요청마다 달라서 쓸 수 없습니다. 1페이지의 rows와 totalSize를 SHA-256으로 해시해 비교합니다.
- **구간별 갱신** (`packages/core/src/refresh.ts`): 상위 40페이지(1~1,000위)는 1페이지가 바뀌면 최소 10분 간격으로, 바뀌지 않아도 60분마다 다시 읽습니다. 보드 전체는 2시간마다 읽습니다. 상위만 읽으면 직전 스냅샷의 1,001위 이하와 합치고, 그 사이 상위로 올라온 플레이어는 하위 구간에서 제거합니다. 하위 구간의 기준 시각은 따로 저장해 화면에 표시합니다.
- **갱신 우선순위**: 후보는 "목표 주기 대비 얼마나 늦었는지(urgency)"로 정렬합니다. 상위 갱신이 예산을 계속 차지해도, 오래 기다린 전체 갱신의 urgency가 커져 결국 앞으로 나옵니다.
- **아시아·태평양 우선**: 한국 커뮤니티를 먼저 대상으로 하므로 AP는 더 짧은 주기를 씁니다(상위 갱신 최소 5분, 변경이 없어도 30분, 전체 1시간). 정렬할 때 AP의 urgency는 2배로 치고, 같으면 AP > US > EU 순입니다. 총 요청 예산은 같고, 그 안에서 AP의 몫이 커지는 방식입니다.
- **시즌 고정**: 수집 중 시즌이 바뀌어도 한 시즌의 데이터만 읽도록, 모든 페이지 요청에 probe가 본 `seasonId`를 붙입니다. 시즌이 바뀌면 끝난 시즌의 최종 순위를 한 번 더 수집합니다.
- **무결성 검사**: 빠진 페이지, 짧은 중간 페이지, 페이지 위치와 맞지 않는 순위, 다른 시즌 데이터, 큰 크기 차이(2% 초과)가 있으면 게시하지 않습니다.

## 동시성과 일관성

- **보드별 잠금**: D1의 조건부 UPDATE(compare-and-swap)로 lease 30분 잠금을 겁니다. 긴 수집은 배치마다 lease를 연장하고, 잠금을 빼앗겼으면 요청 없이 멈춥니다.
- **원자적 게시**: 스냅샷은 버전별 불변 키로 R2에 쓰고, D1 포인터는 "잠금 소유자이면서 더 새로운 스냅샷일 때만" 교체합니다. 독자는 반쯤 쓰인 데이터를 볼 수 없습니다.
- **두 버전 보존**: 웹 isolate가 직전 포인터를 잠시 들고 있을 수 있어, 직전 버전은 남기고 그보다 오래된 것만 지웁니다.
- **재시도 안전성**: 게시 step이 재시도될 때 이미 게시한 자기 스냅샷을 지우지 않도록 확인합니다.

## 업스트림 보호

값은 모두 `apps/crawler/src/limits.ts`에 있습니다. 개발 중 동시 요청 약 90개로 크롤했다가 IP가 403으로 차단된 일이 이 장치들의 출발점입니다.

- **요청 예산**: 모든 probe와 크롤이 D1 토큰 버킷 하나를 공유합니다(시간당 3,000건, 최대 600건 버스트). 리필과 차감을 한 번의 조건부 UPDATE로 처리해 동시 예약이 초과 사용하지 않습니다. 크롤은 50페이지마다 토큰을 예약하고, 부족하면 Workflow `step.sleep`으로 기다립니다(요청·CPU 사용 없음).
- **동시성**: 동시 크롤 최대 2개, 크롤당 동시 요청 3개, probe 동시 요청 2개입니다.
- **서킷 브레이커**: 403이나 429를 한 번이라도 받으면 probe와 모든 크롤이 요청을 멈춥니다. 연속으로 차단되면 대기 시간이 30분 → 1시간 → 2시간…으로 늘고(최대 6시간), 풀린 뒤에도 strike당 처리량(예산 리필, 슬롯, 병렬도)을 절반으로 줄였다가 6시간 무사고마다 한 단계씩 회복합니다.
- 차단을 IP 변경이나 프록시로 우회하지 않습니다.

## 장애 대응과 알림

- 비공식 API 응답은 zod로 검증하고, 실패하면 이전 스냅샷을 유지합니다.
- 차단 중이거나 1시간 넘게 갱신이 없으면 모든 페이지 상단에 안내를 띄웁니다. 상태는 `/status`와 `/api/status`에서 볼 수 있습니다.
- **Discord 알림** (`ALERT_WEBHOOK_URL` secret, 문구는 `apps/crawler/src/messages.ts`):
  - 장애: 한 보드가 3번 연속 실패했을 때, 블리자드 차단이 시작됐을 때 한 번씩 보냅니다.
  - 복구: 그 보드가 다시 게시됐을 때, 차단이 풀린 뒤 첫 요청이 성공했을 때 보냅니다.
  - 일일 리포트: 매일 23:50(KST)에 보드별 상태, 그날 기록한 순위 수, 차단 상태를 보냅니다. 하루 한 번만 가도록 D1에 날짜 마커를 둡니다.
  - Workflow는 깨어날 때 `run()`을 처음부터 다시 실행(replay)하므로, Workflow 안의 알림은 `step.do` 안에서 보내 중복을 막습니다.
  - 크롤러 자체가 멈추면 알림도 멈춥니다. 매일 리포트가 오는지로 생존을 확인합니다.

## 순위 기록

플레이어 페이지의 순위 추이는 두 가지입니다. "전체"는 수집할 때마다 바뀐 순위를, "일별"은 하루 마감 순위를 보여줍니다.

### 측정마다 (전체)

- 게시 단계에서 직전 스냅샷과 비교해, 순위나 레이팅이 바뀐 이름만 D1 `rank_points`에 기록합니다(delta encoding). 실측 기준으로 한 번 게시할 때 래더는 행의 10~40%, 투기장은 0~2%만 바뀌어, 하루 약 30만 행으로 Workers Paid 포함량 안에 들어옵니다.
- 이름의 행 중 하나라도 바뀌면 그 이름의 모든 행을 함께 기록합니다. 그래서 한 시각에는 동명이인 전원의 상태가 들어 있고, 일별과 같은 추적(`traceSeries`)을 시각 단위로 그대로 쓸 수 있습니다.
- 값은 다음 변화까지 유지되므로 계단형으로 그리고, 마지막 값은 최신 스냅샷 시각까지 이어 그립니다.
- 포인터 교체 전에 기록하고 `INSERT OR IGNORE`로 넣어, 게시 step이 재시도돼도 중복이 생기지 않습니다. 잠금 덕분에 비교 기준(직전 스냅샷)은 게시 순간까지 바뀌지 않습니다.
- 최근 2시즌만 보관합니다. 끝난 시즌은 수백만 행일 수 있어, 일일 tick에서 기본 키 범위로 1만 행씩 나눠 지웁니다.
- 웹은 이 기록을 보드 포인터의 `generatedAt`을 키에 넣어 캐시하므로, 새 스냅샷이 게시되면 바로 다시 읽습니다.

### 하루 마감 (일별)

- 5분 cron 중 KST 23:50~24:00 사이 tick이 보드별 마감 순위를 기록합니다. 보드-날짜 단위로 멱등입니다.
- R2 `daily/`에 원본 스냅샷을 영구 보관하고, D1 `rank_history`는 최근 2시즌만 유지하는 조회용 인덱스입니다. 행 삽입은 `json_each`로 묶어 완료 표시와 함께 한 번의 batch(트랜잭션)로 씁니다.
- 이름은 고유하지 않습니다(배틀태그 번호 비공개). 동명이인의 추이는 날짜마다 직전에 고른 순위와 가장 가까운 순위를 이어 붙여 추적합니다.

## 웹

- **데이터 계층**: 파싱한 스냅샷 인덱스는 불변 키 기준의 isolate LRU에, 보드 포인터는 30초 TTL로 캐시합니다. 요청 안의 중복 호출은 `React.cache`로 합칩니다. Workers에서는 다른 요청이 만든 진행 중 Promise를 공유하면 안 되므로, 요청 간 캐시에는 완료된 값만 둡니다.
- **검색**: 대소문자를 무시하는 NFKC 정규화 후 부분 일치이며, 정확히 일치 > 접두 일치 > 포함 순, 같으면 순위, 그다음 보드 순서(아시아·태평양 > 아메리카 > 유럽)로 정렬합니다. 전 보드를 메모리에서 스캔합니다.
- **표시 순서**: 지역은 어디서나 아시아·태평양, 아메리카, 유럽 순입니다(`REGIONS`, `compareBoards`). D1의 `ORDER BY region`은 알파벳순이므로 서비스 계층에서 다시 정렬합니다.
- **순위 변동·컷**: 리더보드 페이지는 그 페이지 25명의 이름만으로 직전 마감일(`history_days`)의 `rank_history`를 조회해 변동을 계산하고, 스냅샷 키·페이지 단위로 캐시합니다. 동명이인은 가장 가까운 직전 순위끼리 짝짓습니다(`packages/core/src/standings.ts`). 컷 레이팅은 스냅샷에서 바로 읽습니다.
- **즐겨찾기·최근 본 플레이어**: 계정이 없으므로 브라우저 `localStorage`에만 저장하고 `useSyncExternalStore`로 읽어 하이드레이션과 탭 간 동기화를 맞춥니다. 시즌은 저장하지 않고, 홈이 서버에서 넘겨준 현재 시즌으로 링크합니다.
- **공유 이미지**: Next.js `opengraph-image` 규칙을 쓰고, OpenNext가 `@vercel/og`를 Workers용 빌드로 바꿉니다. 이름은 어떤 문자든 올 수 있어 CJK 폰트를 번들하지 않고, Google Fonts에서 필요한 글자만(`text=`) 받아 씁니다.
- **렌더링**: 데이터 영역은 `<Suspense>`로 스트리밍합니다. 지역·모드·시즌 파라미터는 레이아웃에서 먼저 검증해, 잘못된 주소는 실제 404 상태를 반환합니다.
- **Cache Components를 끈 이유**: Next.js 16의 `cacheComponents`는 OpenNext로 Workers 런타임에서 실행하면 요청이 멈추는 문제가 있습니다([vercel/next.js#94880](https://github.com/vercel/next.js/issues/94880), [opennextjs-cloudflare#1225](https://github.com/opennextjs/opennextjs-cloudflare/issues/1225), [#1369](https://github.com/opennextjs/opennextjs-cloudflare/issues/1369)). 페이지는 이미 스트리밍 구조라, 문제가 해결되면 `next.config.ts`의 플래그만 켜면 정적 셸 사전 렌더링이 추가됩니다.

## 테스트 전략

- 기능은 TDD(실패하는 테스트 → 구현)로 만들었습니다.
- `packages/core`: Vitest 단위 테스트. 실제 Blizzard 응답을 저장한 fixture를 씁니다.
- `apps/crawler`: `@cloudflare/vitest-pool-workers`로 실제 workerd 런타임과 D1/R2 위에서 실행합니다. 가짜 Blizzard가 실제 동시 요청 수까지 측정하고, Workflow는 introspection API로 검증합니다.
- `apps/web`: Vitest + Testing Library로 데이터 계층과 클라이언트 컴포넌트를 테스트하고, async Server Component는 Next.js 권장대로 Playwright E2E로 검증합니다(데스크톱·모바일). E2E는 fixture를 시드한 격리 로컬 상태에서 돌고, 시드가 끝난 뒤 dev 서버를 띄워 SQLite 동시 접근을 피합니다.

## 로컬 개발

```bash
npm install
npm run db:migrate:local -w crawler        # 공유 로컬 D1에 마이그레이션 적용
npm run dev -w crawler                     # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"   # probe 1회 실행 (실제 Blizzard 호출)
npm run dev -w web                         # http://localhost:3000
```

crawler와 web은 같은 로컬 상태(`.wrangler/state`)를 공유하므로, 크롤된 데이터가 그대로 웹에 보입니다. Blizzard를 호출하지 않고 화면만 보려면 E2E 시드 상태를 쓰면 됩니다.

```bash
npm run test:e2e -w web                    # 시드 생성 겸 E2E
cd apps/web && HEARTHGG_STATE_DIR=.wrangler/e2e-state npm run dev
```

`.npmrc`의 `legacy-peer-deps=true`는 npm 11.6 미만에서 vitest 4의 optional peer를 해석하다 생기는 크래시("reading 'edgesOut'")를 피하기 위한 설정입니다. 필요한 peer는 모두 직접 선언되어 있습니다.

## 배포

Workflows와 분 단위 Cron을 쓰므로 Workers Paid 플랜($5/월)을 기준으로 합니다. 이 프로젝트의 사용량은 Paid 플랜 포함량 안에 들어옵니다.

```bash
# 1회: 리소스 생성
npx wrangler r2 bucket create hearthgg-snapshots
npx wrangler r2 bucket create hearthgg-web-opennext-cache
npx wrangler d1 create hearthgg            # 출력된 database_id를 두 wrangler.jsonc에 반영

# 마이그레이션과 배포
npm exec -w crawler -- wrangler d1 migrations apply hearthgg --remote
npm exec -w crawler -- wrangler secret put ALERT_WEBHOOK_URL   # 선택: Discord 웹훅
npm run deploy -w crawler
npm run deploy -w web                      # 사이트 주소는 apps/web/.env.production의 NEXT_PUBLIC_SITE_URL
```
