-- ============================================================
-- Migration v10: 연구 주제 발굴 검색 라운드 영구 저장
-- ============================================================
-- 이전: localStorage (브라우저 한정, PC 이동 시 유실)
-- 이후: Supabase DB (기기 무관, 영구 보존)
--
-- papers, verifications: JSONB (검색 결과 원본 저장)
-- saved_semantic_ids    : 저장된 논문의 Semantic Scholar / OpenAlex ID 목록

create table if not exists discovery_rounds (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null references projects(id) on delete cascade,
  question            text        not null,
  angle               text        not null default '',
  user_insight        text,
  keywords            jsonb,
  papers              jsonb       not null default '[]'::jsonb,
  verifications       jsonb       not null default '[]'::jsonb,
  saved_semantic_ids  text[]      not null default '{}',
  show_unrelated      boolean     not null default false,
  created_at          timestamptz not null default now()
);

comment on table discovery_rounds is
  '연구 주제 발굴 검색 라운드. 질문·검색 결과·관련성 검토·저장 이력을 영구 보존.';

create index if not exists discovery_rounds_project_idx
  on discovery_rounds(project_id, created_at);

alter table discovery_rounds enable row level security;
create policy "allow_all_discovery_rounds"
  on discovery_rounds for all
  using (true)
  with check (true);
