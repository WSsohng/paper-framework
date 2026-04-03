-- migration-v5: journals 테이블에 트랙별 Fit 분석 결과 저장 컬럼 추가
-- 각 저널 카드에서 프로젝트 내 트랙별 게재 적합도를 AI가 분석한 결과를 저장한다.

-- TrackFitAnalysis 구조 (JSON per entry):
-- {
--   track_id:    uuid string
--   track_name:  string
--   track_color: string (hex)
--   fit_level:   "optimal" | "adequate" | "insufficient" | "excessive"
--   fit_reason:  string (Korean, 2-3 sentences)
--   analyzed_at: ISO datetime string
-- }

alter table journals
  add column if not exists track_analyses jsonb not null default '[]'::jsonb;

comment on column journals.track_analyses is
  'AI-computed per-track fit analysis. Array of TrackFitAnalysis objects.';
