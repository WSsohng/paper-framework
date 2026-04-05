-- ============================================================
-- Migration v9: Research Intent 변경 이력 추적
-- ============================================================
-- intent_updated_at : 가장 최근 research_intent 변경 시각
--                     (NULL = 최초 설정 이후 변경 없음)
-- intent_history    : 변경 이력 배열 (최신 → 과거 순)
--   [{ changed_at, old_intent, new_intent, note? }, ...]

alter table projects
  add column if not exists intent_updated_at timestamptz,
  add column if not exists intent_history    jsonb not null default '[]'::jsonb;

comment on column projects.intent_updated_at is
  '가장 최근 research_intent 변경 시각. NULL = 초기 설정 이후 미변경.';

comment on column projects.intent_history is
  'Research Intent 변경 이력. [{changed_at, old_intent, new_intent, note?}]';
