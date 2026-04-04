-- ============================================================
-- PaperFactory — Full Schema (Project → Track hierarchy)
-- ============================================================

-- shared helper: auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Projects (최상위 연구 아이디어)
-- ============================================================

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

-- ============================================================
-- Module 0: Tracks (프로젝트 내 세부 연구 주제)
-- ============================================================

create table if not exists tracks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade,
  parent_track_id uuid references tracks(id)   on delete set null,
  relation_type   text default 'parallel'
                    check (relation_type in ('parallel','sequential')),
  name            text not null,
  description     text,
  research_intent text,
  color           text not null default '#6366f1',
  status          text not null default 'active'
                    check (status in ('active','paused','archived')),
  tags            text[] default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger tracks_updated_at before update on tracks
  for each row execute function update_updated_at();

create index if not exists tracks_project_id_idx    on tracks(project_id);
create index if not exists tracks_parent_id_idx     on tracks(parent_track_id);
create index if not exists tracks_status_idx        on tracks(status);

-- Papers (트랙별 세부 논문 분석)
create table if not exists papers (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid references tracks(id) on delete cascade,
  title       text not null,
  authors     text[] not null default '{}',
  journal     text,
  year        integer,
  doi         text,
  abstract    text,
  notes       text,
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

-- Reference Papers (프로젝트 공유 참고문헌)
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

-- ============================================================
-- Module 1: Journal Intelligence (프로젝트 공유)
-- ============================================================

create table if not exists journals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references projects(id) on delete set null,
  name           text not null,
  publisher      text,
  issn           text,
  impact_factor  numeric(6,3),
  scope          text,
  website        text,
  submission_url text,
  status         text not null default 'considering'
                   check (status in ('considering','shortlisted','submitted','accepted','rejected','withdrawn')),
  notes          text,
  tags           text[] default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger journals_updated_at before update on journals
  for each row execute function update_updated_at();

create index if not exists journals_project_id_idx on journals(project_id);
create index if not exists journals_status_idx     on journals(status);

-- ============================================================
-- Module 2: Asset Library (프로젝트 공유)
-- ============================================================

create table if not exists assets (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  type       text not null default 'note'
               check (type in ('quote','figure','table','data','reference','note')),
  title      text not null,
  content    text,
  source     text,
  tags       text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();

create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists assets_type_idx       on assets(type);

-- ============================================================
-- Module 3: Argument Architect (트랙 고유)
-- ============================================================

create table if not exists hypotheses (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid references tracks(id) on delete set null,
  title       text not null,
  statement   text,
  rationale   text,
  status      text not null default 'draft'
                check (status in ('draft','active','testing','confirmed','rejected')),
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger hypotheses_updated_at before update on hypotheses
  for each row execute function update_updated_at();

create index if not exists hypotheses_track_id_idx on hypotheses(track_id);
create index if not exists hypotheses_status_idx   on hypotheses(status);

-- ============================================================
-- Module 4: Draft Factory (트랙 고유)
-- ============================================================

create table if not exists drafts (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid references tracks(id) on delete set null,
  journal_id  uuid references journals(id) on delete set null,
  title       text not null,
  abstract    text,
  body        text,
  status      text not null default 'outline'
                check (status in ('outline','drafting','revising','ready','submitted')),
  word_count  integer,
  notes       text,
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger drafts_updated_at before update on drafts
  for each row execute function update_updated_at();

create index if not exists drafts_track_id_idx   on drafts(track_id);
create index if not exists drafts_journal_id_idx on drafts(journal_id);
create index if not exists drafts_status_idx     on drafts(status);

-- ============================================================
-- Module 5: Figure & Data (트랙 고유)
-- ============================================================

create table if not exists figures (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid references tracks(id) on delete set null,
  draft_id    uuid references drafts(id) on delete set null,
  title       text not null,
  type        text not null default 'chart'
                check (type in ('chart','graph','diagram','table','image','other')),
  caption     text,
  description text,
  file_url    text,
  status      text not null default 'planned'
                check (status in ('planned','draft','final')),
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger figures_updated_at before update on figures
  for each row execute function update_updated_at();

create index if not exists figures_track_id_idx on figures(track_id);
create index if not exists figures_draft_id_idx on figures(draft_id);
create index if not exists figures_status_idx   on figures(status);

-- ============================================================
-- Module 6: Red Team & Submit (트랙 고유)
-- ============================================================

create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  draft_id   uuid references drafts(id)  on delete cascade,
  track_id   uuid references tracks(id)  on delete set null,
  persona    text,
  feedback   text not null,
  severity   text not null default 'minor'
               check (severity in ('minor','major','critical')),
  category   text not null default 'other'
               check (category in ('methodology','clarity','novelty','structure','data','other')),
  resolved   boolean not null default false,
  tags       text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_updated_at before update on reviews
  for each row execute function update_updated_at();

create index if not exists reviews_draft_id_idx on reviews(draft_id);
create index if not exists reviews_resolved_idx on reviews(resolved);
