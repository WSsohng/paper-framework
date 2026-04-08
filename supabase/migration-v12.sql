-- ============================================================
-- Migration v12: hypotheses 테이블에 methodology, result_notes 추가
-- ============================================================
-- methodology  : AI가 제안하는 증명 방법론 (사람이 편집 가능)
-- result_notes : 실험 후 인간이 직접 기록하는 결과 노트

ALTER TABLE hypotheses
  ADD COLUMN IF NOT EXISTS methodology  text,
  ADD COLUMN IF NOT EXISTS result_notes text;
