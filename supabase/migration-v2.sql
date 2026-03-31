-- ============================================================
-- Migration v2: Project → Track hierarchy
-- 기존 데이터베이스에 적용할 마이그레이션
-- (fresh install의 경우 schema.sql 전체 실행)
-- ============================================================

-- 1. projects 테이블 (신규)
create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  research_intent text,
  status          text not null default 'active'
                    check (status in ('active','paused','completed','archived')),
  tags            text[] default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

create index if not exists projects_status_idx on projects(status);

-- 2. reference_papers 테이블 (신규)
create table if not exists reference_papers (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title      text not null,
  authors    text[] not null default '{}',
  journal    text,
  year       integer,
  doi        text,
  abstract   text,
  notes      text,
  status     text not null default 'unread'
               check (status in ('unread','reading','read','key','archived')),
  tags       text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reference_papers_updated_at before update on reference_papers
  for each row execute function update_updated_at();

create index if not exists reference_papers_project_id_idx on reference_papers(project_id);
create index if not exists reference_papers_status_idx     on reference_papers(status);

-- 3. tracks 테이블 확장
alter table tracks
  add column if not exists project_id      uuid references projects(id) on delete set null,
  add column if not exists parent_track_id uuid references tracks(id)   on delete set null,
  add column if not exists relation_type   text default 'parallel'
                                             check (relation_type in ('parallel','sequential')),
  add column if not exists research_intent text;

create index if not exists tracks_project_id_idx on tracks(project_id);

-- 4. journals: track_id → project_id
alter table journals
  add column if not exists project_id uuid references projects(id) on delete set null;

-- NOTE: 기존 track_id 데이터를 project_id로 옮기고 싶다면:
-- UPDATE journals j SET project_id = t.project_id
-- FROM tracks t WHERE j.track_id = t.id AND t.project_id IS NOT NULL;

alter table journals drop column if exists track_id;
create index if not exists journals_project_id_idx on journals(project_id);

-- 5. assets: track_id, paper_id → project_id
alter table assets
  add column if not exists project_id uuid references projects(id) on delete set null;

alter table assets drop column if exists track_id;
alter table assets drop column if exists paper_id;
create index if not exists assets_project_id_idx on assets(project_id);
