# Phase 1 — `papers` vs `reference_papers` 통합 설계

> 생성일: 2026-04-18
> 브랜치: `refactor/phase-1-papers-consolidation`
> 선행 결정: `00-baseline.md`, `roadmap.md §Phase 0 결정 D-1 ~ D-3`

---

## 1. 문제 재확인

두 테이블이 동일 개념을 중복 표현:

| 테이블 | 스코프 | 실데이터(2026-04-18) | UI 경로 | 파일 수 |
|--------|--------|----------------------|---------|--------|
| `papers` | track | **0 rows** (사용자 확인) | `/papers`, `/papers/[id]` | 6개 파일만 참조 |
| `reference_papers` | project | 실 사용 중 | `/reference-papers`, `/assets` 등 | 22개 파일 참조 + junction `reference_paper_tracks` |

`reference_papers`가 시스템의 실질 허브이며 `papers`는 미사용 뼈대. Phase 0 게이트에서 **A안(reference_papers로 통일, papers 제거)** 확정.

---

## 2. 세 가지 안 비교

roadmap.md가 제시한 3개 안을 사후 비교 기록 (감사 추적용):

### A안 · `papers` 테이블 완전 제거 ✅ 채택

- **DDL**: `drop table papers cascade`
- **데이터 이관**: 실 데이터 0건이라 불필요. 단 migration 스크립트에 `count(*) = 0` 안전장치 필수
- **track 스코프 논문 개념**: `reference_papers` + `reference_paper_tracks` junction(R1/R2/R3)로 이미 표현됨
- **UI**: `/papers` 라우트 삭제, 트랙 상세 페이지는 R레벨별 참고문헌 요약을 보여주는 형태로 전환 (scope 확장 없이 기존 `getTrackRelevances` 활용)

**장점**
- 타입·라우트·페이지 중복 제거
- `Paper` / `ReferencePaper` 타입 2중 관리 종료
- 단일 개념으로 Phase 2A·2B 설계 단순화
- dead code 5건 동시 정리 가능 (D-3)

**단점**
- 추후 "트랙 전용 정독 노트" 니즈가 재발하면 별도 설계 필요 (수용 가능)

### B안 · `papers` 로 통일, `project_id` + `track_id` 모두 허용

- 이미 사용 중인 `reference_papers`의 모든 데이터를 `papers`로 이관 필요
- `reference_paper_tracks` junction을 `papers_tracks` 로 이름 교체
- `reference_papers` 관련 22개 파일이 모두 `papers`로 리팩토링 대상

**각하 사유**: 작업량이 A안 대비 3~4배, `papers`가 0건이라 통일 방향이 역행.

### C안 · 단일 `papers` + `paper_scope` enum(`project` | `track`)

- 테이블은 1개, `scope` 컬럼으로 구분
- 스키마는 유연하지만 모든 쿼리에 `where scope = ...` 강제

**각하 사유**: B안과 작업량 유사 + 쿼리 복잡도 증가, junction 테이블과 역할 중복.

---

## 3. A안 구현 스펙

### 3.1 마이그레이션 (`supabase/migration-v15.sql`)

**UP 순서 (안전장치 포함):**

```sql
-- 1) 데이터 실재 여부 확인 (0이 아니면 중단)
do $$
declare
  row_count int;
  notes_count int;
begin
  select count(*), count(notes) into row_count, notes_count from papers;
  raise notice 'papers 테이블 행 수=%, notes 있음=%', row_count, notes_count;
  if row_count > 0 then
    raise exception
      'papers 테이블에 %개 행이 있습니다. Phase 1 A안은 데이터 0건을 가정합니다. '
      '진행 전에 데이터 이관 방안을 확정하세요.',
      row_count;
  end if;
end $$;

-- 2) 테이블 제거 (CASCADE — 트리거·인덱스·RLS 함께 제거)
drop trigger if exists papers_updated_at on papers;
drop index  if exists papers_track_id_idx;
drop index  if exists papers_status_idx;
drop table  if exists papers cascade;
```

**DOWN 순서 (schema.sql v14 상태 복원):**

```sql
create table if not exists papers (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid references tracks(id) on delete cascade,
  title       text not null,
  authors     text[] not null default '{}',
  journal     text,  year integer,  doi text,
  abstract    text,  notes text,
  status      text not null default 'unread'
                check (status in ('unread','reading','read','key','archived')),
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger papers_updated_at before update on papers
  for each row execute function update_updated_at();
create index if not exists papers_track_id_idx on papers(track_id);
create index if not exists papers_status_idx   on papers(status);
alter table papers enable row level security;
create policy "allow_all_papers" on papers for all using (true) with check (true);
```

**실행 전 체크리스트:**
- [ ] Supabase Studio에서 `papers` 행 수 0 재확인
- [ ] Supabase 스냅샷 생성 (`pg_dump` 또는 Studio Backup)
- [ ] `schema.sql` 도 v15 반영하여 갱신 (Phase 5에서 일괄)

### 3.2 TypeScript 타입 (`lib/types.ts`)

**제거:**
- `Paper` interface (L117~133)
- `PaperInput` interface (L135~146)
- `Track.paper_count` 필드

**유지:**
- `PaperStatus` — `ReferencePaper`가 계속 사용
- `ReferencePaper`, `ReferencePaperInput` — 전체 유지

### 3.3 Server actions

| 파일 | 조치 |
|------|------|
| `lib/actions/papers.ts` | **전체 파일 삭제** (D-1) |
| `lib/actions/tracks.ts` | `.select('*, papers(count), ...')` → `.select('*, project:projects(...), parent_track:...)` 로 간소화. `paper_count` 계산 로직 제거 |
| `lib/actions/reference-paper-tracks.ts` | `getPaperRelevances` 함수 제거 (D-3, 호출처 없음) |
| `lib/actions/ai/extract-concepts.ts` | `recalcPriorityScore` 함수 제거 (D-3, 호출처 없음) |
| `lib/actions/ai/extract-keywords.ts` | **파일 삭제** (D-3, orphan) |
| `lib/actions/ai/research-keywords.ts` | **파일 삭제** (D-3, orphan) |

### 3.4 AI Feature 타입 (`lib/ai/generate.ts`)

Phase 0 탐색에서 `track_monitoring`을 orphan으로 잘못 분류했으나, 실제로는 `lib/actions/search/track-monitoring.ts` + `components/module0/track-monitor-button.tsx` 에서 사용 중. **2건만 제거.**

```diff
 export type AIFeature =
   | 'concept_extraction'
   | 'journal_analysis'
   | 'journal_recommendation'
   | 'asset_insights'
   | 'research_questions'
-  | 'research_keywords'
   | 'topic_recommendation'
   | 'timeliness_analysis'
   | 'tier_monitoring'
   | 'relevance_tagging'
   | 'track_monitoring'
-  | 'search_keywords'
   | 'search_plan'
   | 'search_synthesis'
   | 'paper_verification'
   | 'hypothesis_generation'
   | 'other'
```

**기존 로그 보존**: `ai_usage_logs.feature`는 `text` 컬럼이라 Union 축소해도 과거 행은 그대로 보존. 조회 시 `'other'` 분류 fallback.

### 3.5 App 라우트

| 파일 | 조치 |
|------|------|
| `app/(app)/papers/page.tsx` | **삭제** |
| `app/(app)/papers/[id]/page.tsx` | **삭제** |
| `app/(app)/tracks/[id]/page.tsx` | Papers 섹션 제거, 대체 섹션 추가(§3.7) |

### 3.6 컴포넌트

| 파일 | 조치 |
|------|------|
| `components/module0/paper-form.tsx` | **삭제** |
| `components/module0/paper-dialog.tsx` | **삭제** |
| `components/ui/badge.tsx` `PaperStatusBadge` | **유지** (reference_papers 쪽에서 사용) |

### 3.7 Track 상세 페이지 대체 섹션

**기존 (Papers 섹션):** 이 트랙의 `papers[]`를 status별 그룹핑하여 표시.

**신규 (Reference Papers by Relevance 섹션):**
- `getTrackRelevances(projectId, trackId)` + `getReferencePapers(projectId)` 조인하여 R1/R2/R3별 그룹핑
- 각 논문은 `/reference-papers/[id]` 로 이동
- 태깅·편집 버튼은 없음 (편집은 `/reference-papers` 허브에서)
- 빈 상태: "참고문헌 태깅 UI는 /reference-papers 에서" 안내

이 변경은 Phase 1 스코프 확장 같지만, 기존 페이지를 "papers 없으면 빈 화면"으로 두는 건 UX 퇴행. 최소 정보 유지선.

### 3.8 Seed / Schema

- `supabase/seed-dummy.sql`: `papers` INSERT 구문 없음(`from papers` grep 결과). 변경 불필요.
- `supabase/schema.sql`: Phase 1에서는 **v15까지 반영하지 않고** Phase 5에서 일괄 재생성 (roadmap.md Phase 5 산출물)

---

## 4. 영향받는 파일 최종 목록 (10개 + α)

| # | 파일 | 조치 |
|---|------|------|
| 1 | `supabase/migration-v15.sql` | **신규** 생성 (UP + DOWN) |
| 2 | `lib/types.ts` | Paper·PaperInput 제거, Track.paper_count 제거 |
| 3 | `lib/ai/generate.ts` | AIFeature 3건 제거 |
| 4 | `lib/actions/papers.ts` | **삭제** |
| 5 | `lib/actions/tracks.ts` | papers(count) 제거 |
| 6 | `lib/actions/reference-paper-tracks.ts` | getPaperRelevances 제거 |
| 7 | `lib/actions/ai/extract-concepts.ts` | recalcPriorityScore 제거 |
| 8 | `lib/actions/ai/extract-keywords.ts` | **삭제** |
| 9 | `lib/actions/ai/research-keywords.ts` | **삭제** |
| 10 | `app/(app)/papers/page.tsx` | **삭제** |
| 11 | `app/(app)/papers/[id]/page.tsx` | **삭제** |
| 12 | `app/(app)/tracks/[id]/page.tsx` | Papers 섹션 교체 |
| 13 | `components/module0/paper-form.tsx` | **삭제** |
| 14 | `components/module0/paper-dialog.tsx` | **삭제** |
| 15 | `docs/opus-refactor/phase1-design.md` | 본 문서 |

roadmap 예상 10개 ± 5개 — 범위 내.

---

## 5. E2E 수동 검증 체크리스트

Phase 1 PR 머지 전 사용자가 로컬 환경에서 수행:

### 5.1 선행 작업
- [ ] 로컬 Supabase에서 `papers` 행 수 0 확인
- [ ] `supabase db reset` 또는 `supabase/migration-v15.sql` UP 블록 실행
- [ ] Next.js 개발 서버 재기동

### 5.2 기능 검증
- [ ] `/` → 대시보드 로딩 정상 (500 없음)
- [ ] `/papers` → 404 응답 (라우트 삭제 확인)
- [ ] `/reference-papers` → 목록 정상 표시, T1/T2/T3 필터 동작
- [ ] `/reference-papers/[id]` → 상세 페이지 정상
- [ ] `/reference-papers/[id]` 에서 편집·삭제 동작
- [ ] `/tracks` → 트랙 카드 목록 정상, 논문 개수 표시 없어짐
- [ ] `/tracks/[id]` → 헤더·시의성 패널 정상
- [ ] `/tracks/[id]` → 신규 "연관 참고문헌" 섹션 표시, R1/R2/R3 그룹핑 동작
- [ ] `/assets` → 자산 목록 정상, 참고문헌 연결 동작
- [ ] `/dashboard` → 프로젝트 요약 정상
- [ ] M0 AI 버튼: Tier/R태깅/컨셉 추출 정상
- [ ] M3 AI 가설 제안: `generateHypotheses` 여전히 작동 (assets + reference_papers + discovery_rounds 컨텍스트)

### 5.3 롤백 리허설 (옵션)
- [ ] DOWN 스크립트 실행하여 `papers` 테이블 재생성 확인
- [ ] 재차 UP 스크립트 실행하여 idempotent 확인

---

## 6. 롤백 플랜

1. 사용자가 UP 스크립트 실행 후 이상 감지 → 즉시 `supabase/migration-v15.sql` DOWN 블록 실행
2. 해당 PR revert (`git revert <merge-sha>` → 다시 PR)
3. Phase 1 재설계 여부는 사용자 판단

---

## 7. 확정 게이트 (Phase 1 PR 머지 전)

사용자에게 확인 요청:
1. §5.2 체크리스트 전부 통과 여부
2. 기존 `/papers` 북마크·링크 사용자 자료에 있는지 (문서·README 등)
3. 프로덕션 Supabase의 `papers` 행 수도 0인지 재확인 (로컬과 다를 수 있음)

통과 시 main merge.
