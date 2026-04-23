-- ============================================================
-- PaperFactory — Canonical Schema Snapshot (v14까지 적용)
-- ============================================================
-- 이 파일은 migration-v1 ~ v14를 모두 반영한 현재 DB 상태입니다.
-- 새 환경 셋업 시 이 파일을 실행하세요.
-- 개별 마이그레이션은 supabase/migration-vN.sql 을 참조하세요.
-- ============================================================

-- ── 공통 헬퍼 ────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- reference_paper_tracks 전용 트리거 함수 (v14)
create or replace function update_reference_paper_tracks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Projects (최상위 연구 아이디어)
-- ============================================================
-- v1: 기본 컬럼
-- v9: intent_updated_at, intent_history 추가

create table if not exists projects (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  description       text,
  research_intent   text,
  status            text        not null default 'active'
                      check (status in ('active','paused','completed','archived')),
  tags              text[]      default '{}',
  -- v9: Research Intent 변경 이력
  intent_updated_at timestamptz,
  intent_history    jsonb       not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

create index if not exists projects_status_idx on projects(status);

-- v13: RLS
alter table projects enable row level security;
create policy "allow_all_projects" on projects
  for all using (true) with check (true);

-- ============================================================
-- Tracks (프로젝트 내 세부 연구 주제)
-- ============================================================
-- v1: 기본 컬럼
-- v3: current_stage, experiment_start_date, target_submit_date, context_log 추가
--
-- Note: tracks.project_id ON DELETE CASCADE (schema.sql 기준이 정답).
-- migration-v2의 ADD COLUMN IF NOT EXISTS 라인은 컬럼이 이미 존재해
-- no-op으로 처리되었으므로 실제 DB는 CASCADE.

create table if not exists tracks (
  id                    uuid        primary key default gen_random_uuid(),
  project_id            uuid        references projects(id) on delete cascade,
  parent_track_id       uuid        references tracks(id)   on delete set null,
  relation_type         text        default 'parallel'
                          check (relation_type in ('parallel','sequential')),
  name                  text        not null,
  description           text,
  research_intent       text,
  color                 text        not null default '#6366f1',
  status                text        not null default 'active'
                          check (status in ('active','paused','archived')),
  tags                  text[]      default '{}',
  -- v3: 논문 작성 Flow
  current_stage         text
                          check (current_stage in (
                            'hypothesis','experiment_design','experiment',
                            'validation','backup_design','backup_experiment',
                            'figures','draft','review','submitted'
                          )),
  experiment_start_date date,
  target_submit_date    date,
  context_log           jsonb       not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger tracks_updated_at before update on tracks
  for each row execute function update_updated_at();

create index if not exists tracks_project_id_idx    on tracks(project_id);
create index if not exists tracks_parent_id_idx     on tracks(parent_track_id);
create index if not exists tracks_status_idx        on tracks(status);

-- v13: RLS
alter table tracks enable row level security;
create policy "allow_all_tracks" on tracks
  for all using (true) with check (true);

-- ============================================================
-- Papers (트랙별 세부 논문 분석)
-- ============================================================

create table if not exists papers (
  id          uuid        primary key default gen_random_uuid(),
  track_id    uuid        references tracks(id) on delete cascade,
  title       text        not null,
  authors     text[]      not null default '{}',
  journal     text,
  year        integer,
  doi         text,
  abstract    text,
  notes       text,
  status      text        not null default 'unread'
                check (status in ('unread','reading','read','key','archived')),
  tags        text[]      default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger papers_updated_at before update on papers
  for each row execute function update_updated_at();

create index if not exists papers_track_id_idx on papers(track_id);
create index if not exists papers_status_idx   on papers(status);

-- v13: RLS
alter table papers enable row level security;
create policy "allow_all_papers" on papers
  for all using (true) with check (true);

-- ============================================================
-- Reference Papers (프로젝트 공유 참고문헌)
-- ============================================================
-- v1: 기본 컬럼
-- v3: tier 추가
-- v6: concepts, relevance_score, priority_score 추가

create table if not exists reference_papers (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id) on delete cascade,
  title           text        not null,
  authors         text[]      not null default '{}',
  journal         text,
  year            integer,
  doi             text,
  abstract        text,
  notes           text,
  status          text        not null default 'unread'
                    check (status in ('unread','reading','read','key','archived')),
  tags            text[]      default '{}',
  -- v3: 논문 품질 티어
  tier            integer     check (tier in (1, 2, 3)),
  -- v6: AI 개념 추출 + 우선순위
  concepts        text[]      not null default '{}',
  relevance_score float       check (relevance_score >= 0 and relevance_score <= 1),
  priority_score  float       check (priority_score  >= 0 and priority_score  <= 100),
  -- v19: 검색 소스에서 수집한 품질 지표 (T 태깅·IF 필터 활용)
  citation_count  integer,
  impact_factor   numeric(6,3),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger reference_papers_updated_at before update on reference_papers
  for each row execute function update_updated_at();

create index if not exists reference_papers_project_id_idx on reference_papers(project_id);
create index if not exists reference_papers_status_idx     on reference_papers(status);
create index if not exists reference_papers_tier_idx       on reference_papers(tier);
create index if not exists reference_papers_priority_idx
  on reference_papers(priority_score desc nulls last);

-- v13: RLS
alter table reference_papers enable row level security;
create policy "allow_all_reference_papers" on reference_papers
  for all using (true) with check (true);

-- ============================================================
-- Reference Paper ↔ Track 연관도 (v8)
-- ============================================================
-- Tier(T1/T2/T3) = 논문 자체 품질·신뢰도 (reference_papers.tier)
-- 연관도(R1/R2/R3) = 특정 트랙과의 주제 관련성 (트랙별 독립)

create table if not exists reference_paper_tracks (
  reference_paper_id  uuid        not null references reference_papers(id) on delete cascade,
  track_id            uuid        not null references tracks(id) on delete cascade,
  relevance_level     integer     not null check (relevance_level in (1, 2, 3)),
  relevance_reason    text,
  tagged_by           text        not null default 'ai'
                        check (tagged_by in ('ai', 'user')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  primary key (reference_paper_id, track_id)
);

comment on table reference_paper_tracks is
  '논문-트랙 연관도 (R1 핵심/R2 부분/R3 배경). Tier와 독립적.';
comment on column reference_paper_tracks.relevance_level is
  'R1: 핵심 연관 / R2: 부분 연관 / R3: 배경 연관';

-- v14: updated_at 자동갱신 트리거
create trigger reference_paper_tracks_updated_at
  before update on reference_paper_tracks
  for each row execute function update_reference_paper_tracks_updated_at();

create index if not exists ref_paper_tracks_track_idx
  on reference_paper_tracks(track_id, relevance_level);
create index if not exists ref_paper_tracks_paper_idx
  on reference_paper_tracks(reference_paper_id);

-- v8: RLS
alter table reference_paper_tracks enable row level security;
create policy "allow_all_ref_paper_tracks" on reference_paper_tracks
  for all using (true) with check (true);

-- ============================================================
-- Journals (프로젝트 공유 저널 정보, Module 1)
-- ============================================================
-- v1: 기본 컬럼
-- v5: track_analyses 추가

create table if not exists journals (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        references projects(id) on delete set null,
  name            text        not null,
  publisher       text,
  issn            text,
  impact_factor   numeric(6,3),
  scope           text,
  website         text,
  submission_url  text,
  status          text        not null default 'considering'
                    check (status in ('considering','shortlisted','submitted','accepted','rejected','withdrawn')),
  notes           text,
  tags            text[]      default '{}',
  -- v5: 트랙별 게재 적합도 AI 분석 결과
  track_analyses  jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger journals_updated_at before update on journals
  for each row execute function update_updated_at();

create index if not exists journals_project_id_idx on journals(project_id);
create index if not exists journals_status_idx     on journals(status);

-- v13: RLS
alter table journals enable row level security;
create policy "allow_all_journals" on journals
  for all using (true) with check (true);

-- ============================================================
-- Assets (프로젝트 공유 자료 라이브러리, Module 2)
-- ============================================================
-- v1: 기본 컬럼
-- v4: reference_paper_id, paper_section 추가
-- v6: concepts 추가
-- v11: type 제약에 'idea' 추가

create table if not exists assets (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        references projects(id) on delete set null,
  type                text        not null default 'note'
                        check (type in ('quote','figure','table','data','reference','note','idea')),
  title               text        not null,
  content             text,
  source              text,
  tags                text[]      default '{}',
  -- v4: 출처 논문 연결
  reference_paper_id  uuid        references reference_papers(id) on delete set null,
  paper_section       text
                        check (paper_section in (
                          'intro','methods','results','discussion','conclusion','supplementary'
                        )),
  -- v6: AI 추출 개념 태그
  concepts            text[]      not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();

create index if not exists assets_project_id_idx        on assets(project_id);
create index if not exists assets_type_idx              on assets(type);
create index if not exists assets_reference_paper_id_idx on assets(reference_paper_id);
create index if not exists assets_paper_section_idx     on assets(paper_section);

-- v13: RLS
alter table assets enable row level security;
create policy "allow_all_assets" on assets
  for all using (true) with check (true);

-- ============================================================
-- Hypotheses (트랙 고유, Module 3)
-- ============================================================
-- v1: 기본 컬럼
-- v12: methodology, result_notes 추가

create table if not exists hypotheses (
  id           uuid        primary key default gen_random_uuid(),
  track_id     uuid        references tracks(id) on delete set null,
  title        text        not null,
  statement    text,
  rationale    text,
  status       text        not null default 'draft'
                 check (status in ('draft','active','testing','confirmed','rejected')),
  tags         text[]      default '{}',
  -- v12: 증명 방법론 + 실험 결과 기록
  methodology  text,
  result_notes text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger hypotheses_updated_at before update on hypotheses
  for each row execute function update_updated_at();

create index if not exists hypotheses_track_id_idx on hypotheses(track_id);
create index if not exists hypotheses_status_idx   on hypotheses(status);

-- v13: RLS
alter table hypotheses enable row level security;
create policy "allow_all_hypotheses" on hypotheses
  for all using (true) with check (true);

-- ============================================================
-- Drafts (트랙 고유, Module 4)
-- ============================================================

create table if not exists drafts (
  id          uuid        primary key default gen_random_uuid(),
  track_id    uuid        references tracks(id)    on delete set null,
  journal_id  uuid        references journals(id)  on delete set null,
  title       text        not null,
  abstract    text,
  body        text,
  status      text        not null default 'outline'
                check (status in ('outline','drafting','revising','ready','submitted')),
  word_count  integer,
  notes       text,
  tags        text[]      default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger drafts_updated_at before update on drafts
  for each row execute function update_updated_at();

create index if not exists drafts_track_id_idx   on drafts(track_id);
create index if not exists drafts_journal_id_idx on drafts(journal_id);
create index if not exists drafts_status_idx     on drafts(status);

-- v13: RLS
alter table drafts enable row level security;
create policy "allow_all_drafts" on drafts
  for all using (true) with check (true);

-- ============================================================
-- Figures (트랙 고유, Module 5)
-- ============================================================

create table if not exists figures (
  id          uuid        primary key default gen_random_uuid(),
  track_id    uuid        references tracks(id)  on delete set null,
  draft_id    uuid        references drafts(id)  on delete set null,
  title       text        not null,
  type        text        not null default 'chart'
                check (type in ('chart','graph','diagram','table','image','other')),
  caption     text,
  description text,
  file_url    text,
  status      text        not null default 'planned'
                check (status in ('planned','draft','final')),
  tags        text[]      default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger figures_updated_at before update on figures
  for each row execute function update_updated_at();

create index if not exists figures_track_id_idx on figures(track_id);
create index if not exists figures_draft_id_idx on figures(draft_id);
create index if not exists figures_status_idx   on figures(status);

-- v13: RLS
alter table figures enable row level security;
create policy "allow_all_figures" on figures
  for all using (true) with check (true);

-- ============================================================
-- Reviews (트랙 고유, Module 6)
-- ============================================================

create table if not exists reviews (
  id         uuid        primary key default gen_random_uuid(),
  draft_id   uuid        references drafts(id)  on delete cascade,
  track_id   uuid        references tracks(id)  on delete set null,
  persona    text,
  feedback   text        not null,
  severity   text        not null default 'minor'
               check (severity in ('minor','major','critical')),
  category   text        not null default 'other'
               check (category in ('methodology','clarity','novelty','structure','data','other')),
  resolved   boolean     not null default false,
  tags       text[]      default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_updated_at before update on reviews
  for each row execute function update_updated_at();

create index if not exists reviews_draft_id_idx on reviews(draft_id);
create index if not exists reviews_resolved_idx on reviews(resolved);

-- v13: RLS
alter table reviews enable row level security;
create policy "allow_all_reviews" on reviews
  for all using (true) with check (true);

-- ============================================================
-- AI Token Usage Logs (v7)
-- ============================================================

create table if not exists ai_usage_logs (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        references projects(id) on delete set null,
  feature       text        not null,
  provider      text        not null,
  model         text        not null,
  input_tokens  integer     not null default 0,
  output_tokens integer     not null default 0,
  created_at    timestamptz not null default now()
);

comment on table  ai_usage_logs            is 'AI API 호출별 토큰 사용량 로그';
comment on column ai_usage_logs.feature    is '호출 기능 레이블 (UI 표시용)';
comment on column ai_usage_logs.provider   is 'claude | openai 등';

create index if not exists ai_usage_logs_project_idx on ai_usage_logs(project_id);
create index if not exists ai_usage_logs_created_idx on ai_usage_logs(created_at desc);
create index if not exists ai_usage_logs_feature_idx on ai_usage_logs(feature);

alter table ai_usage_logs enable row level security;
create policy "allow_all_ai_usage" on ai_usage_logs
  for all using (true) with check (true);

-- ============================================================
-- Discovery Rounds (연구 주제 발굴 검색 라운드, v10)
-- ============================================================

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
create policy "allow_all_discovery_rounds" on discovery_rounds
  for all using (true) with check (true);

-- ============================================================
-- Column comments (v14)
-- ============================================================

comment on column tracks.project_id is
  'FK → projects.id ON DELETE CASCADE (schema.sql 기준). '
  'migration-v2의 SET NULL 라인은 no-op이었으며 실제 DB는 CASCADE.';

comment on column projects.intent_updated_at is
  '가장 최근 research_intent 변경 시각. NULL = 초기 설정 이후 미변경.';
comment on column projects.intent_history is
  'Research Intent 변경 이력. [{changed_at, old_intent, new_intent, note?}]';

comment on column reference_papers.concepts        is 'AI 추출 핵심 개념 키워드 목록';
comment on column reference_papers.relevance_score is '프로젝트 Research Intent 대비 관련도 (AI, 0–1)';
comment on column reference_papers.priority_score  is '우선순위 점수: tier(45%) + 최신성(15%) + 관련도(40%), 0–100';

comment on column assets.reference_paper_id is
  '이 자산이 인용/추출된 참고문헌 (reference_papers.id)';
comment on column assets.paper_section is
  '이 자산을 사용할 논문 섹션 — AI 초고 생성 시 컨텍스트로 활용';
comment on column assets.concepts is
  'AI 추출 핵심 개념 태그 (연결 논문에서 상속 or 자체 추출)';

comment on column journals.track_analyses is
  'AI-computed per-track fit analysis. Array of TrackFitAnalysis objects.';

comment on column tracks.current_stage is
  '논문 작성 Flow 현재 단계 (M3→실험→M5→M4→M6)';
comment on column tracks.context_log is
  '트랙 내 핵심 결정사항 누적 (가설 선택, 실험값 요약, 방향 수정 등). AI 프롬프트 컨텍스트로 사용.';
