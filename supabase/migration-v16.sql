-- ============================================================
-- Migration v16 — ai_budgets 테이블 (Phase 3-pre)
-- ============================================================
-- 배경: docs/opus-refactor/phase3-pre-design.md
-- 전제: Phase 1 완료 (migration-v15 적용)
-- 목적: 프로젝트별 월간 AI 예산 설정.
--       generate.ts 호출 전에 이번 달 누적 + 이번 호출 예상 비용을
--       계산하여 경고 또는 선택적 차단.
--
-- Phase 3-full 에서 확장 예정: UI, 기능별 quota, 히스토리.
-- ============================================================


-- ── UP ───────────────────────────────────────────────────

create table if not exists ai_budgets (
  project_id            uuid           primary key
                          references projects(id) on delete cascade,
  monthly_limit_usd     numeric(10, 2) not null
                          check (monthly_limit_usd > 0),
  warning_threshold_pct numeric(5, 2)  not null default 80
                          check (warning_threshold_pct >= 0 and warning_threshold_pct <= 100),
  hard_limit_enabled    boolean        not null default false,
  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now()
);

comment on table  ai_budgets is
  '프로젝트별 월간 AI 예산. Phase 3-pre: 경고 + 선택적 차단. Phase 3-full에서 UI/quota 추가.';
comment on column ai_budgets.monthly_limit_usd is
  '월 한도 (USD). UTC 기준 매월 1일 0시부터 누적 리셋.';
comment on column ai_budgets.warning_threshold_pct is
  '경고 임계값(%). 예상 누적이 이 비율을 넘으면 console.warn 출력.';
comment on column ai_budgets.hard_limit_enabled is
  'true면 한도 초과 예상 시 BudgetExceededError throw. false면 경고만.';

create trigger ai_budgets_updated_at before update on ai_budgets
  for each row execute function update_updated_at();

alter table ai_budgets enable row level security;
create policy "allow_all_ai_budgets" on ai_budgets
  for all using (true) with check (true);


-- ── DOWN (주석 처리) ─────────────────────────────────────
-- 롤백 시 주석 해제 후 실행.
--
-- drop trigger if exists ai_budgets_updated_at on ai_budgets;
-- drop policy  if exists "allow_all_ai_budgets" on ai_budgets;
-- drop table   if exists ai_budgets cascade;
