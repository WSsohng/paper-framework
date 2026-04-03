-- ============================================================
-- Dummy Seed 전체 삭제 스크립트
-- ============================================================
-- 아래 순서로 실행하면 더미 데이터가 모두 제거됩니다.
-- (cascade가 없는 테이블은 수동 삭제)

-- 1. reviews (draft_id FK, cascade on delete draft)
DELETE FROM reviews WHERE id LIKE '00000000-0000-0000-0008-%';

-- 2. figures
DELETE FROM figures WHERE id LIKE '00000000-0000-0000-0007-%';

-- 3. drafts
DELETE FROM drafts WHERE id LIKE '00000000-0000-0000-0006-%';

-- 4. hypotheses
DELETE FROM hypotheses WHERE id LIKE '00000000-0000-0000-0005-%';

-- 5. assets
DELETE FROM assets WHERE id LIKE '00000000-0000-0000-0004-%';

-- 6. journals (project_id = set null on cascade, 수동 삭제 필요)
DELETE FROM journals WHERE id LIKE '00000000-0000-0000-0003-%';

-- 7. project 삭제 → tracks, reference_papers, papers 모두 cascade 삭제
DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000001';
