-- ============================================================
-- Migration v15 — papers 테이블 제거 (Phase 1 A안)
-- ============================================================
-- 배경: docs/opus-refactor/phase1-design.md
-- 전제: 운영 DB에서 select count(*) from papers = 0 확인 완료 (2026-04-18)
-- 효과: 트랙 스코프 "분석 논문" 개념을 reference_papers + reference_paper_tracks 로 통합
--
-- 실행 전 필수:
--   1. Supabase Studio에서 papers 행 수 0 재확인
--   2. Supabase 스냅샷 생성 (Backup)
--   3. schema.sql 은 Phase 5에서 일괄 갱신 (여기선 건드리지 않음)
-- ============================================================


-- ── UP ───────────────────────────────────────────────────
-- 행이 존재하면 예외를 던져 중단. 안전장치.

do $$
declare
  row_count   int;
  notes_count int;
begin
  select count(*), count(notes) into row_count, notes_count from papers;
  raise notice 'migration-v15 pre-check: papers rows=%, rows_with_notes=%', row_count, notes_count;

  if row_count > 0 then
    raise exception
      '[migration-v15 abort] papers 테이블에 %개 행이 존재합니다. '
      'Phase 1 A안은 실데이터 0건을 전제로 합니다. '
      '데이터 이관이 필요하면 phase1-design.md 를 재설계하세요.',
      row_count;
  end if;
end $$;

-- 트리거·인덱스·RLS·테이블 순차 제거
drop trigger if exists papers_updated_at on papers;
drop index  if exists papers_track_id_idx;
drop index  if exists papers_status_idx;
drop policy if exists "allow_all_papers" on papers;
drop table  if exists papers cascade;


-- ── DOWN (주석 처리) ─────────────────────────────────────
-- 롤백 시 주석을 해제하고 실행. schema.sql v14 상태 복원.
--
-- create table if not exists papers (
--   id          uuid        primary key default gen_random_uuid(),
--   track_id    uuid        references tracks(id) on delete cascade,
--   title       text        not null,
--   authors     text[]      not null default '{}',
--   journal     text,
--   year        integer,
--   doi         text,
--   abstract    text,
--   notes       text,
--   status      text        not null default 'unread'
--                 check (status in ('unread','reading','read','key','archived')),
--   tags        text[]      default '{}',
--   created_at  timestamptz not null default now(),
--   updated_at  timestamptz not null default now()
-- );
--
-- create trigger papers_updated_at before update on papers
--   for each row execute function update_updated_at();
--
-- create index if not exists papers_track_id_idx on papers(track_id);
-- create index if not exists papers_status_idx   on papers(status);
--
-- alter table papers enable row level security;
-- create policy "allow_all_papers" on papers for all using (true) with check (true);
