-- ============================================================
-- Migration v6: M2 지능화 — 개념 태그 + 우선순위 점수
-- ============================================================
-- Stage 1: AI 핵심 개념 자동 추출 (concepts)
-- Stage 2: 우선순위 점수 계산 (relevance_score, priority_score)

-- 1. reference_papers: 개념 태그 + 관련도 + 우선순위
alter table reference_papers
  add column if not exists concepts       text[]  not null default '{}',
  add column if not exists relevance_score float
    check (relevance_score >= 0 and relevance_score <= 1),
  add column if not exists priority_score  float
    check (priority_score  >= 0 and priority_score  <= 100);

comment on column reference_papers.concepts        is 'AI 추출 핵심 개념 키워드 목록';
comment on column reference_papers.relevance_score is '프로젝트 Research Intent 대비 관련도 (AI, 0–1)';
comment on column reference_papers.priority_score  is '우선순위 점수: tier(45%) + 최신성(15%) + 관련도(40%), 0–100';

create index if not exists reference_papers_priority_idx
  on reference_papers(priority_score desc nulls last);

-- 2. assets: 개념 태그 (논문에서 상속 or 독립 추출)
alter table assets
  add column if not exists concepts text[] not null default '{}';

comment on column assets.concepts is 'AI 추출 핵심 개념 태그 (연결 논문에서 상속 or 자체 추출)';
