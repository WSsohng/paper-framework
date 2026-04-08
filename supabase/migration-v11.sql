-- ============================================================
-- Migration v11: assets.type 제약에 'idea' 추가
-- ============================================================
-- 이전: type IN ('quote','figure','table','data','reference','note')
-- 이후: + 'idea' — 빠른 아이디어 메모장 타입 지원

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;
ALTER TABLE assets
  ADD CONSTRAINT assets_type_check
  CHECK (type IN ('quote','figure','table','data','reference','note','idea'));
