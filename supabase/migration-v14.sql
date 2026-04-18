-- ============================================================
-- Migration v14: reference_paper_tracks updated_at 트리거 + FK 문서 정리
-- ============================================================

-- ── reference_paper_tracks: updated_at 자동갱신 트리거 ─────
-- v8에서 컬럼은 추가했으나 트리거가 빠져 있어,
-- upsert 후에도 updated_at이 갱신되지 않는 문제 수정.

create or replace function update_reference_paper_tracks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reference_paper_tracks_updated_at on reference_paper_tracks;
create trigger reference_paper_tracks_updated_at
  before update on reference_paper_tracks
  for each row execute function update_reference_paper_tracks_updated_at();

-- ── tracks.project_id FK 문서화 주석 ──────────────────────
-- 실제 DB 상태: ON DELETE CASCADE (schema.sql에서 최초 생성)
-- migration-v2의 ADD COLUMN IF NOT EXISTS는 컬럼이 이미 존재해
-- no-op으로 처리되었으므로 SET NULL 라인은 적용되지 않았음.
-- 즉, 프로젝트 삭제 시 하위 트랙도 함께 삭제됨 → 의도한 동작.
-- (별도 ALTER 불필요)
comment on column tracks.project_id is
  'FK → projects.id ON DELETE CASCADE (schema.sql 기준). '
  'migration-v2의 SET NULL 라인은 no-op이었으며 실제 DB는 CASCADE.';
