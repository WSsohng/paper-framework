# Phase 3-pre — AI 예산 거버넌스 경량판

브랜치: `refactor/phase-3-pre-budget`
전제: Phase 1 완료 (`migration-v15` 적용)
후행: Phase 2A (프롬프트 빌더) — 경량판 도입 후 착수

---

## 1. 배경

Phase 0 게이트에서 확정된 **D-5 분리 결정**에 따라, Phase 3을 둘로 나눈다.

- **Phase 3-pre** (지금): AI 비용 폭주 위험(R-6) 완화. UI 없음.
- **Phase 3-full** (Phase 2A 이후): 설정 UI·기능별 quota·경고 배너.

Phase 2A 착수 전에 최소한의 **"호출 차단" 안전장치**를 마련한다.

---

## 2. 목표와 범위

### 2.1 목표

1. 프로젝트별 월 예산(USD)을 DB에 설정할 수 있다.
2. `generateJson` 호출 **직전** 이번 달 누적 + 이번 호출 추정 비용을 계산한다.
3. 한도 초과 예상 시
   - `hard_limit_enabled=true` → `BudgetExceededError` throw
   - `hard_limit_enabled=false` → `console.warn` 만 (통과)
4. `AI_BUDGET_BYPASS=1` env 로 전면 우회 가능 (테스트/긴급 상황용).

### 2.2 범위 밖

- 설정 UI (Phase 3-full)
- 기능별 quota (Phase 3-full)
- 예산 변경 이력·감사 로그 (Phase 3-full)
- 멀티 사용자별 quota (Phase 5에서 RLS 전환 이후)

---

## 3. 데이터 모델

### 3.1 `ai_budgets` 테이블 (`migration-v16.sql`)

| 컬럼                       | 타입            | 설명                                                      |
|----------------------------|-----------------|-----------------------------------------------------------|
| `project_id`               | uuid (PK, FK)   | `projects(id)` ON DELETE CASCADE. 프로젝트당 1행.          |
| `monthly_limit_usd`        | numeric(10, 2)  | 월 한도. `> 0` 제약.                                       |
| `warning_threshold_pct`    | numeric(5, 2)   | 경고 임계(%). 기본 80. `0..100` 제약.                      |
| `hard_limit_enabled`       | boolean         | 기본 false. true면 초과 시 throw.                          |
| `created_at`, `updated_at` | timestamptz     | 자동 갱신 (`update_updated_at` 트리거 재사용).              |

- RLS: `allow_all_ai_budgets` (개발 단계, D-2 합치).
- DOWN 스크립트는 주석으로 포함.

---

## 4. 구현

### 4.1 공용 헬퍼 — `lib/ai/pricing.ts`

`ai-usage.ts` 에 박혀 있던 Haiku 가격 상수를 중앙화.

```ts
CLAUDE_PRICING        // Record<model, { input, output }>
calcCostUsd(model, inputTokens, outputTokens)
estimatePromptTokens(prompt)                        // ≈ chars / 3.5
estimateCallCostUsd(prompt, maxTokens, model)       // 최대 예상 비용
```

### 4.2 타입/에러 — `lib/ai/budget.ts`

```ts
BudgetStatus           // 전면 상태 (limit / current / projected / util / flags)
BudgetExceededError    // Error 서브클래스
```

### 4.3 `lib/ai/generate.ts` 통합

- `generateJson()` 본문에서 Claude 호출 전 `enforceBudget()` 실행.
- 내부 헬퍼 `computeBudgetStatus()` 가 Supabase에서 예산·이번 달 로그를 읽어 상태 계산.
- 예산 체크 **실패**(네트워크·쿼리 에러)는 AI 호출을 막지 않고 `console.warn` 만 출력 (가용성 우선).

### 4.4 서버 액션 — `lib/actions/ai-budget.ts`

- `getAiBudget(projectId)`
- `upsertAiBudget({ project_id, monthly_limit_usd, warning_threshold_pct?, hard_limit_enabled? })`
- `deleteAiBudget(projectId)`
- `getAiBudgetStatus(projectId)` — UI 표시용 (budget + currentUsd + utilizationPct)

Phase 3-full에서 UI가 이 액션들을 호출. Phase 3-pre는 호출부 없음 (수동 설정).

### 4.5 타입 — `lib/types.ts`

- `AiBudget`, `AiBudgetInput` 추가.

### 4.6 기존 `ai-usage.ts` 리팩토링

- 내부 `calcCost()` → 공용 `calcCostUsd` 로 교체.
- 가격 상수 중복 제거.

---

## 5. 동작 시나리오

### 5.1 예산 미설정 (기본)
```
generateJson() → ai_budgets 조회 → row 없음 → 기존과 동일 동작
```
→ 영향 없음. 기존 모든 AI 호출 그대로 작동.

### 5.2 경고만 (`hard_limit_enabled=false`)
```sql
insert into ai_budgets (project_id, monthly_limit_usd) values ('<pid>', 10.00);
```
- 누적 $7 + 이번 호출 $0.5 → 75% → 경고 없음, 호출 성공.
- 누적 $8.5 + 이번 호출 $0.5 → 90% → `[AI Budget WARN]` 로그, 호출 성공.
- 누적 $10 + 이번 호출 $1 → 110% → `[AI Budget EXCEED]` 로그 + 계속 진행.

### 5.3 차단 활성 (`hard_limit_enabled=true`)
```sql
update ai_budgets set hard_limit_enabled = true where project_id = '<pid>';
```
- 110% → `throw BudgetExceededError` → 호출부에서 catch 후 사용자 메시지 표시.

### 5.4 긴급 우회
```
AI_BUDGET_BYPASS=1 npm run dev
```
- 모든 예산 체크 스킵.

---

## 6. 파일 변경 요약

### 신규
- `supabase/migration-v16.sql`
- `lib/ai/pricing.ts`
- `lib/ai/budget.ts`
- `lib/actions/ai-budget.ts`
- `docs/opus-refactor/phase3-pre-design.md` (이 문서)

### 수정
- `lib/ai/generate.ts` — `enforceBudget()` / `computeBudgetStatus()` 추가
- `lib/actions/ai-usage.ts` — 가격 상수 제거, `pricing.ts` 사용
- `lib/types.ts` — `AiBudget`, `AiBudgetInput` 추가

---

## 7. 검증 체크리스트

### 7.1 자동 (Opus 수행)

- [x] `tsc --noEmit` 에러 0
- [x] `next build` 성공
- [x] 기존 AI 호출 회귀 없음 (예산 미설정 프로젝트)

### 7.2 수동 (사용자 확정 게이트)

1. **마이그레이션 실행**
   - `supabase/migration-v16.sql` 을 Supabase SQL Editor 에서 실행.
   - 에러 없이 `ai_budgets` 테이블이 생성되었는지 확인.

2. **기본 동작 (예산 미설정)**
   - 아무 AI 기능(예: `/reference-papers` 에서 AI 분석) 실행.
   - 콘솔에 `[AI Budget]` 로그 없음. 기존과 동일.

3. **경고 동작**
   ```sql
   insert into ai_budgets (project_id, monthly_limit_usd)
   values ('<테스트용-project-id>', 0.10);
   -- 매우 낮게 설정하여 즉시 경고 유도
   ```
   - AI 분석 실행 → 서버 콘솔에 `[AI Budget WARN]` 또는 `[AI Budget EXCEED]` 출력.
   - AI 호출은 **성공**.

4. **차단 동작**
   ```sql
   update ai_budgets set hard_limit_enabled = true
   where project_id = '<테스트용-project-id>';
   ```
   - AI 분석 재실행 → 실패 (서버 로그에 `BudgetExceededError`).
   - 사용자 UI에 에러 메시지 표시 (호출부마다 다름).

5. **우회 동작**
   - `.env.local` 에 `AI_BUDGET_BYPASS=1` 추가 후 재시작.
   - 4번과 동일 조건에서 호출 **성공**.

6. **정리**
   ```sql
   delete from ai_budgets where project_id = '<테스트용-project-id>';
   ```

---

## 8. 롤백 계획

### 8.1 코드

- `git revert <commit>` 또는 `refactor/phase-3-pre-budget` 브랜치 병합 취소.

### 8.2 DB

- `migration-v16.sql` DOWN 블록(주석) 실행:
  ```sql
  drop trigger if exists ai_budgets_updated_at on ai_budgets;
  drop policy  if exists "allow_all_ai_budgets" on ai_budgets;
  drop table   if exists ai_budgets cascade;
  ```

---

## 9. Phase 3-pre 확정 게이트 결정 (2026-04-18)

| # | 질문 | 결정 | 반영 |
|---|---|---|---|
| Q1 | 신규 프로젝트 생성 시 `ai_budgets` 기본 행 자동 insert? | **Yes** | `createProject` 에 기본 $10, warning=80, hard_limit=false 자동 insert. `AI_BUDGET_DEFAULT_LIMIT_USD` env 로 조정 가능 |
| Q2 | 경고/초과 이벤트를 DB에도 기록? | **Yes** | `migration-v17.sql` 로 `ai_budget_events` 추가. `enforceBudget` 에서 warn/exceed/blocked 각각 insert |
| Q3 | 이 경량판으로 Phase 2A 착수 허용? | **Yes** | 3-pre 병합 직후 Phase 2A 착수. Phase 3-full 은 Phase 2A 이후 |

### Q1 상세 — 자동 insert 기본값

- `monthly_limit_usd` : `process.env.AI_BUDGET_DEFAULT_LIMIT_USD` 가 있으면 그 값, 없으면 **$10**
- `warning_threshold_pct` : 80
- `hard_limit_enabled` : **false** (안전 기본값 — 경고만, 차단 안 함)
- insert 실패 시 `console.warn` 만 남기고 프로젝트 생성은 성공 처리 (가용성 우선)
- 기존 프로젝트에는 소급 적용 안 함 — 필요하면 수동 SQL

### Q2 상세 — 이벤트 테이블 스키마

- 테이블: `ai_budget_events` (`migration-v17.sql`)
- 컬럼: `id`, `project_id`, `feature`, `event_type`, `limit_usd`, `current_usd`, `estimate_usd`, `projected_usd`, `utilization_pct`, `created_at`
- `event_type`: `warn` / `exceed` / `blocked`
- 인덱스: `(project_id, created_at desc)` — 대시보드 조회 대비
- RLS: `allow_all_ai_budget_events` (개발 단계)
- `enforceBudget()` 에서 `logBudgetEvent()` 호출 (fire-and-forget — 로깅 실패가 AI 호출 막지 않음)
- 기록 시점:
  - utilization > warningPct (warn)
  - utilization > 100 + hardLimit=false (exceed, 호출은 진행)
  - utilization > 100 + hardLimit=true (blocked, throw 직전)

### Q3 상세 — 후속 Phase

- Phase 3-pre 병합 완료 → 바로 **Phase 2A(프롬프트 빌더)** 착수
- Phase 3-full(예산 UI·기능별 quota·배너)은 Phase 2A 완료 후로 이동
