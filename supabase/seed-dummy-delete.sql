-- ============================================================
-- Dummy Seed 전체 삭제 스크립트
-- ============================================================
-- 아래 순서로 실행하면 더미 데이터가 모두 제거됩니다.
-- UUID 컬럼은 LIKE 직접 사용 불가 → id::text 캐스팅 필요

-- 1. reviews
DELETE FROM reviews WHERE id::text LIKE '00000000-0000-0000-0008-%';

-- 2. figures
DELETE FROM figures WHERE id::text LIKE '00000000-0000-0000-0007-%';

-- 3. drafts
DELETE FROM drafts WHERE id::text LIKE '00000000-0000-0000-0006-%';

-- 4. hypotheses
DELETE FROM hypotheses WHERE id::text LIKE '00000000-0000-0000-0005-%';

-- 5. assets
DELETE FROM assets WHERE id::text LIKE '00000000-0000-0000-0004-%';

-- 6. journals
DELETE FROM journals WHERE id::text LIKE '00000000-0000-0000-0003-%';

-- 7. reference_papers
DELETE FROM reference_papers WHERE id::text LIKE '00000000-0000-0000-0002-%';

-- 8. tracks
DELETE FROM tracks WHERE id::text LIKE '00000000-0000-0000-0001-%';

-- 9. project (cascade로 남은 연관 데이터 정리)
DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000001';
