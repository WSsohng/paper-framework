# Phase 0 — 리팩토링 리스크 등록부

> 생성일: 2026-04-18
> 기준: `00-baseline.md`
> 평가 기준: 발생 가능성(L/M/H) × 영향(L/M/H) × 롤백 난이도(L/M/H)

각 리스크는 Phase 진입 시 완화 전략이 확정되어야 하며, 미완화 리스크가 H/H 이상이면 해당 Phase는 **중단하고 사용자 보고**한다 (roadmap.md §실행 가드레일).

---

## R-1. `papers` 제거 시 트랙별 정독 노트 손실 (Phase 1)

| 항목 | 값 |
|------|-----|
| Phase | 1 |
| 가능성 | H (A안·B안 채택 시) |
| 영향 | M — 사용자 수동 입력 기록 손실 가능 |
| 롤백 난이도 | H — 실제 행이 삭제되면 복구 불가 |

**상세:** `papers` 테이블에 사용자가 정독 시 입력한 `notes`, `status`, `tags`가 존재. A안(`reference_papers`로 통일) 선택 시 매핑 규칙 필요:
- `papers.track_id` → `reference_paper_tracks` junction으로 이관
- `papers.notes` / `papers.tags` → 어떻게 보존할 것인가?
  - 옵션 a) `reference_papers`에 `notes`가 이미 있으므로 합침 (충돌 시 둘 다 보존 + 구분자)
  - 옵션 b) 별도 `track_paper_notes` 테이블 신설
  - 옵션 c) `reference_paper_tracks.relevance_reason`에 흡수

**완화 전략:**
1. **UP 마이그레이션 실행 전 반드시 Supabase 스냅샷 백업** (roadmap.md 실행 가드레일)
2. UP 스크립트에 먼저 "`papers` 행 수·`notes` 비어있지 않은 행 수" 카운트 출력 → 사용자 확인 후 진행
3. 데이터 이관 로직을 별도 `do $$ ... $$` 블록으로 분리하고 각 단계 `raise notice`
4. DOWN 스크립트는 **순수 DDL 롤백만** 수행 (데이터는 `supabase/backup-phase1-<ts>.sql`로 덤프 보관)
5. Phase 1 PR 머지 전 로컬 + 스테이징에서 더미 프로젝트로 전체 flow E2E 수동 검증

---

## R-2. `reference_paper_tracks` 유니크 제약 충돌 (Phase 1)

| 항목 | 값 |
|------|-----|
| Phase | 1 |
| 가능성 | M |
| 영향 | M — 마이그레이션 중단 |
| 롤백 난이도 | L |

**상세:** `reference_paper_tracks`의 PK는 `(reference_paper_id, track_id)`. `papers`를 이관할 때 동일 (ref_paper, track) 조합이 이미 AI 태깅으로 존재하면 PK 충돌 발생.

**완화 전략:**
- 이관 SQL에 `on conflict (reference_paper_id, track_id) do update set ...` 적용
- 충돌 시 `tagged_by='user'` 우선 덮어쓰기 (AI 태깅은 재생성 가능)
- 이관 후 `relevance_reason` 보존 여부 로그

---

## R-3. `papers` 참조 파일 리팩토링 누락 (Phase 1)

| 항목 | 값 |
|------|-----|
| Phase | 1 |
| 가능성 | M |
| 영향 | H — 런타임 500 에러 |
| 롤백 난이도 | M |

**상세:** 6개 파일에 `supabase.from('papers')` 직접 호출. TypeScript 타입 제거로도 잡히지 않는 문자열 기반 쿼리. `tracks/[id]/page.tsx`는 두 테이블 혼용으로 리팩토링 복잡도 최고.

**완화 전략:**
- 리팩토링 PR에 **grep 체크리스트 포함**:
  - `rg "from\\(.papers.\\)" --type ts`
  - `rg "from\\(.reference_papers.\\)" --type ts`
  - `rg "\\bPaper\\b" lib/types.ts lib/actions/ app/ components/`
- Phase 1 완료 조건: 위 grep 0건 (papers 테이블 제거안 기준) 또는 명확히 의도된 경로만 남음 (C안 기준)
- TypeScript 컴파일 + `next build` 성공 필수

---

## R-4. AI 프롬프트 빌더 추상화가 기존 출력을 깨뜨림 (Phase 2A)

| 항목 | 값 |
|------|-----|
| Phase | 2A |
| 가능성 | H |
| 영향 | M — AI 응답 품질 저하 |
| 롤백 난이도 | L (코드 리버트) |

**상세:** 16개 액션 중 5개를 우선 리팩토링. `AIContextBuilder` + `composePrompt`가 생성하는 최종 프롬프트 문자열이 기존 수동 작성본과 미세하게 달라지면, Claude Haiku 특성상 JSON 포맷 일탈·길이 변동·누락 발생 가능.

**완화 전략:**
1. 리팩토링 전후 **동일 입력·seed로 snapshot 테스트** (5개 액션 × 프로젝트 3개 × 2회 = 30개 샘플)
2. 스냅샷 비교 기준:
   - JSON 파싱 성공률 100%
   - 결과 길이(±20%) 내
   - 필수 필드(title/statement 등) 누락 0건
3. 통과 전엔 Phase 2A 머지 금지
4. `ai_usage_logs`로 `input_tokens` 증가율 관찰 — 20% 초과 증가 시 컨텍스트 빌더 재설계

---

## R-5. 프레임워크 프로토콜 이중 삽입 (Phase 2A)

| 항목 | 값 |
|------|-----|
| Phase | 2A |
| 가능성 | H |
| 영향 | L — 토큰 낭비 |
| 롤백 난이도 | L |

**상세:** baseline §2.4에서 확인했듯 현재도 프레임워크 프로토콜 적용 방식이 3가지로 혼재. 빌더 추상화 시 "skip + 프롬프트에 프로토콜 포함" 패턴을 자동 감지 못하면 동일 프로토콜이 **2번** prepend될 수 있음.

**완화 전략:**
- `composePrompt` 계약에 **"프레임워크 프로토콜은 빌더가 한 번만 주입"** 명시
- 리팩토링 시 각 액션의 수동 preamble 제거 확인 체크리스트 PR에 포함

---

## R-6. AI 비용 폭주 (Phase 2A 진행 중) ← 최우선 리스크

| 항목 | 값 |
|------|-----|
| Phase | 2A 진행 중 (Phase 3 이전) |
| 가능성 | M |
| 영향 | H — Claude 청구서 실질 비용 |
| 롤백 난이도 | — (이미 과금된 비용) |

**상세:** Opus 4.7 high 세션 자체 비용 + 리팩토링 중 snapshot 테스트 + 사용자 수동 검증 반복이 겹치면 단기 비용 급증. `ai_budgets` 구현 전까지 **제한 수단이 없다**.

**완화 전략 (roadmap.md 원칙 5번과 일치):**
1. **Phase 2A 착수 전**에 Phase 3의 경량 버전부터 도입:
   - 최소 구현: `ai_budgets` 테이블 + `generate.ts` 호출 전 이번 달 누적 조회 → `console.warn`만
   - 차단 로직은 Phase 3 본편에서 추가
2. 본인 ANTHROPIC 대시보드에 일별 한도 알림 설정
3. snapshot 테스트 시 **실제 Claude 호출 대신 녹화된 응답** 재생 모드 우선 고려
4. Phase 2A 완료 후 즉시 Phase 3 본편 진입 (병렬/보류 금지)

---

## R-7. Phase 2B 흐름도 결정 지연 → Phase 4 블로킹 (Phase 2B→4)

| 항목 | 값 |
|------|-----|
| Phase | 2B |
| 가능성 | M |
| 영향 | M |
| 롤백 난이도 | L |

**상세:** Phase 2B는 "끊긴 엣지를 어떻게 할 것인가" 사용자 결정이 필요한 게이트. 9개 엣지(baseline §4.3)마다 "자동 연결/유지 단절" 판단이 느리면 Phase 4 전체가 대기.

**완화 전략:**
- 2B 산출물(`phase2b-flow-map.md`)에 각 엣지별 **결정 템플릿 제공**:
  - 엣지 ID, 현재 상태, 예상 UX 이득, 구현 복잡도, 권장안
- 사용자가 빈칸 채우기만 하면 되도록 구성

---

## R-8. 데이터 혈통 필드 역사 손실 (Phase 4)

| 항목 | 값 |
|------|-----|
| Phase | 4 |
| 가능성 | L |
| 영향 | M |
| 롤백 난이도 | H |

**상세:** `figures.generated_from_hypothesis_id`, `drafts.source_figures[]` 등 provenance 필드 추가 후 기존 행은 전부 NULL. 이후 "이 figure가 어떤 가설에서 왔는지" 추적 불가.

**완화 전략:**
- 마이그레이션 시 **backfill 옵션 제공**: 동일 track의 최근 hypothesis를 휴리스틱으로 매칭 (사용자 확인 후 실행)
- 기본값은 NULL 유지 + UI에 "기존 데이터" 배지 표시

---

## R-9. main 브랜치 일상 개발과의 충돌 (모든 Phase)

| 항목 | 값 |
|------|-----|
| Phase | 전체 |
| 가능성 | M |
| 영향 | M — conflict 해결 시간 |
| 롤백 난이도 | L |

**상세:** README.md 가이드상 Sonnet 세션은 main에서 계속 작업 가능. Phase 1(대규모 스키마 변경) 진행 중 Sonnet이 `papers` 관련 기능을 수정하면 충돌.

**완화 전략:**
- Phase 1 브랜치 생성 시 사용자에게 **"Phase 1 기간 동안 `papers`·`reference_papers` 관련 기능을 main에서 만지지 말 것"** 공지
- Phase 2A 기간에는 `lib/ai/generate.ts` 시그니처 변경을 main에서 금지 (roadmap 가드레일 §변경 금지)
- 각 Phase 머지 직전 `git merge origin/main` 리허설 → conflict 심하면 사용자 보고

---

## R-10. RLS 정책 전부 `allow_all` 상태 (Phase 3·5 검토 필요)

| 항목 | 값 |
|------|-----|
| Phase | 3·5 (판단 Phase 0) |
| 가능성 | H (판단 회피 시) |
| 영향 | H (향후 멀티유저 전환 시) |
| 롤백 난이도 | M |

**상세:** v13 마이그레이션에서 RLS 활성화했으나 모든 정책이 `using (true) with check (true)`. 현재 단일 사용자 가정이라 문제 없음. 하지만 Phase 3에서 `ai_budgets`를 프로젝트 단위로 도입하면 **예산 데이터 격리**가 RLS에 기대는 순간 빈 껍데기임.

**완화 전략:**
- Phase 0 확정 게이트에서 사용자에게 질의:
  - (a) 단일 사용자 가정 유지 → `allow_all` 그대로 두고 문서화만
  - (b) 멀티유저 전환 예정 → Phase 3에 `auth.uid()` 기반 정책 추가를 명시 스코프로 포함
- 결정을 미루면 Phase 3에서 다시 멈춰야 함

---

## R-11. `AIFeature` 타입과 실제 사용 feature 문자열 불일치 (Phase 2A)

| 항목 | 값 |
|------|-----|
| Phase | 2A |
| 가능성 | L |
| 영향 | L |
| 롤백 난이도 | L |

**상세:** baseline §2.3에서 `search_keywords`가 두 파일에서 공용, `track_monitoring`·`research_keywords`는 고아. Phase 2A에서 feature를 재설계하지 않으면 Phase 3 예산 집계 기준 모호.

**완화 전략:**
- Phase 2A 초반에 `AIFeature` 유니온을 **1:1 파일 대응**으로 재정의 (16개 액션 → 최대 14개 feature, orphan은 타입에서 제거)
- 기존 `ai_usage_logs` 행은 그대로 두고 조회 시만 새 라벨로 집계

---

## R-12. 마이그레이션 v15+ 번호 충돌 (Phase 1·3·4)

| 항목 | 값 |
|------|-----|
| Phase | 1, 3, 4 |
| 가능성 | M |
| 영향 | M |
| 롤백 난이도 | L |

**상세:** 현재 v14까지. Phase 1·3·4 각각 마이그레이션을 추가. 브랜치 병렬 진행 시 동일 버전 번호 두 PR이 동시에 열리면 머지 순서에 따라 한쪽이 재번호 필요.

**완화 전략:**
- 각 Phase 브랜치 착수 시 `supabase/` 폴더 glob 실행 → 마지막 번호 확인 후 +1
- **Phase 브랜치별 예약 번호 고정**: Phase 1 → v15(v17까지 예약), Phase 3 → v18, Phase 4 → v19~
- 실제 번호 확정은 해당 Phase 머지 직전에 재확인

---

## 리스크 Heatmap (Phase 0 시점)

| 리스크 | Phase | 가능성 | 영향 | 롤백 | 우선도 |
|--------|-------|--------|------|------|--------|
| R-6 AI 비용 폭주 | 2A 진행 중 | M | H | — | **최우선** |
| R-1 papers 데이터 손실 | 1 | H | M | H | 높음 |
| R-3 리팩토링 누락 | 1 | M | H | M | 높음 |
| R-4 프롬프트 품질 | 2A | H | M | L | 높음 |
| R-10 RLS 정책 | 3·5 | H | H | M | 중간 (결정 선행) |
| R-7 2B 결정 지연 | 2B | M | M | L | 중간 |
| R-8 provenance 손실 | 4 | L | M | H | 중간 |
| R-9 main 충돌 | 전체 | M | M | L | 낮음 |
| R-2 junction 충돌 | 1 | M | M | L | 낮음 |
| R-5 프로토콜 중복 | 2A | H | L | L | 낮음 |
| R-11 feature 불일치 | 2A | L | L | L | 낮음 |
| R-12 버전 충돌 | 1·3·4 | M | M | L | 낮음 |

---

## Phase 0 확정 게이트에서 사용자에게 물을 질문

1. **R-1:** `papers` 테이블의 실제 사용 밀도는? (운영 DB에서 `select count(*), count(notes) from papers;` 결과)
2. **R-10:** 단일 사용자 가정 유지? 또는 Phase 3에서 RLS 격리 추가?
3. **§3.4 dead code** 5건을 Phase 1 PR에 **사전 정리**로 포함할지, 아니면 남겨둘지
4. **§4.3 끊긴 엣지 #1** (discovery → asset): "저장한 논문에서 자동 asset 생성"이 원하는 UX인지, 수동이 맞는지
5. **R-6 완화 전략 (a)**: Phase 2A 착수 전 Phase 3의 경량 로깅·경고만 선 도입 동의 여부
