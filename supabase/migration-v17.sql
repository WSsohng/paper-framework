-- ============================================================
-- Migration v17 — ai_budget_events 테이블 (Phase 3-pre Q2)
-- ============================================================
-- 배경: Phase 3-pre 확정 게이트에서 "경고/초과 기록 필요" 결정.
-- 전제: migration-v16 적용 완료 (ai_budgets 존재).
-- 목적: generate.ts enforceBudget() 에서 warn/exceed/blocked 이벤트를
--       DB에 남겨 감사·분석·대시보드에서 조회 가능하게 함.
--
-- event_type:
--   - 'warn'    : 경고 임계 초과 (호출은 성공)
--   - 'exceed'  : 한도 초과 + hard_limit_enabled=false (호출은 성공)
--   - 'blocked' : 한도 초과 + hard_limit_enabled=true  (BudgetExceededError)
-- ============================================================


-- ── UP ───────────────────────────────────────────────────

create table if not exists ai_budget_events (
  id              uuid           primary key default gen_random_uuid(),
  project_id      uuid           not null references projects(id) on delete cascade,
  feature         text,
  event_type      text           not null
                    check (event_type in ('warn', 'exceed', 'blocked')),
  limit_usd       numeric(10, 4) not null,
  current_usd     numeric(10, 4) not null,
  estimate_usd    numeric(10, 4) not null,
  projected_usd   numeric(10, 4) not null,
  utilization_pct numeric(7, 2)  not null,
  created_at      timestamptz    not null default now()
);

comment on table  ai_budget_events is
  'AI 예산 경고/초과/차단 이벤트 로그. Phase 3-pre Q2 결정.';
comment on column ai_budget_events.event_type is
  'warn=경고임계 초과 | exceed=한도 초과(통과) | blocked=한도 초과(차단)';

create index if not exists ai_budget_events_project_id_idx
  on ai_budget_events(project_id, created_at desc);

alter table ai_budget_events enable row level security;
create policy "allow_all_ai_budget_events" on ai_budget_events
  for all using (true) with check (true);


-- ── DOWN (주석) ──────────────────────────────────────────
-- drop policy if exists "allow_all_ai_budget_events" on ai_budget_events;
-- drop index  if exists ai_budget_events_project_id_idx;
-- drop table  if exists ai_budget_events cascade;
