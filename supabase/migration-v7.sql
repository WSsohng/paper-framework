-- ============================================================
-- Migration v7: AI Token Usage Logging
-- ============================================================
-- AI 호출마다 토큰 사용량을 기록해 비용을 추적한다.
-- 비용 계산 기준 (2025년 초 기준):
--   Claude 3.5 Haiku: input $0.80/M, output $4.00/M
--   GPT-4o-mini:      input $0.15/M, output $0.60/M

create table if not exists ai_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete set null,
  feature       text not null,   -- 'concept_extraction' | 'journal_analysis' | ...
  provider      text not null,   -- 'claude' | 'openai'
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  created_at    timestamptz not null default now()
);

comment on table ai_usage_logs is 'AI API 호출별 토큰 사용량 로그';
comment on column ai_usage_logs.feature is '호출 기능 레이블 (UI 표시용)';

create index if not exists ai_usage_logs_project_idx   on ai_usage_logs(project_id);
create index if not exists ai_usage_logs_created_idx   on ai_usage_logs(created_at desc);
create index if not exists ai_usage_logs_feature_idx   on ai_usage_logs(feature);

-- RLS: 이 앱은 사이트 비밀번호 인증이므로 anon key로 삽입 허용
alter table ai_usage_logs enable row level security;
create policy "allow_all_ai_usage" on ai_usage_logs
  for all using (true) with check (true);
