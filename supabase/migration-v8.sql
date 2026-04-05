-- ============================================================
-- Migration v8: 트랙별 논문 연관도 (Track-Paper Relevance)
-- ============================================================
-- Tier(T1/T2/T3) = 논문 자체 품질·신뢰도 (기존)
-- 연관도(R1/R2/R3) = 특정 트랙과의 주제 관련성 (신규, 트랙별 독립)
--
-- 같은 논문이 트랙A에서는 R1, 트랙B에서는 R3일 수 있음

create table if not exists reference_paper_tracks (
  reference_paper_id  uuid not null references reference_papers(id) on delete cascade,
  track_id            uuid not null references tracks(id) on delete cascade,

  relevance_level     integer not null check (relevance_level in (1, 2, 3)),
  -- R1: 핵심 연관 — 이 트랙이 직접 다루는 방법론/결과/주제
  -- R2: 부분 연관 — 방법론·개념을 공유, 보강 근거로 활용
  -- R3: 배경 연관 — 분야 맥락, 서론 참조용

  relevance_reason    text,           -- AI 자동 생성, 사람이 수정 가능
  tagged_by           text not null default 'ai'
                        check (tagged_by in ('ai', 'user')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  primary key (reference_paper_id, track_id)
);

comment on table reference_paper_tracks is
  '논문-트랙 연관도 (R1 핵심/R2 부분/R3 배경). Tier와 독립적.';

create index if not exists ref_paper_tracks_track_idx
  on reference_paper_tracks(track_id, relevance_level);

create index if not exists ref_paper_tracks_paper_idx
  on reference_paper_tracks(reference_paper_id);

-- RLS: 앱 전체 허용 (사이트 비밀번호 인증)
alter table reference_paper_tracks enable row level security;
create policy "allow_all_ref_paper_tracks" on reference_paper_tracks
  for all using (true) with check (true);
