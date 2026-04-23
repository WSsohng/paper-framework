-- ============================================================
-- Migration v19 — reference_papers.citation_count + impact_factor
-- ============================================================
-- 배경:
--   `lib/actions/ai/batch-tier.ts`(T1/T2/T3 자동 태깅)가
--   `reference_papers.citation_count` 를 SELECT 하고 있었으나
--   해당 컬럼이 스키마에 없어 다음 에러 발생:
--
--       column reference_papers.citation_count does not exist
--
--   또한 v18(M0 IF 필터)에서 FoundPaper 에 `impact_factor` 를 보강했지만,
--   논문 저장 시 `reference_papers` 에 기록되지 않아 이후 T 태깅 프롬프트가
--   IF 값을 활용할 수 없었다.
--
-- 목적:
--   두 지표(`citation_count`, `impact_factor`) 를 `reference_papers` 에
--   영속화해서
--     1) batch-tier.ts 버그 해결
--     2) 저널 품질·영향력 기반 T 태깅 품질 향상
--     3) M0 IF 필터와 데이터 모델 일관성 확보
--
-- 기존 행: 두 컬럼 모두 NULL 로 생성됨. 이는 정상이며 batch-tier 는
--          `citation_count ?? null`, `impact_factor ?? null` 로 관대하게 처리.
--
-- 전제: migration-v18 (journal_if_cache) 적용 완료.
-- ============================================================

alter table reference_papers
  add column if not exists citation_count integer,
  add column if not exists impact_factor  numeric(6,3);

comment on column reference_papers.citation_count is
  '논문 인용수 (검색 소스: Semantic Scholar `citationCount` 또는 OpenAlex `cited_by_count`). NULL = 미수집.';

comment on column reference_papers.impact_factor is
  '저널 Impact Factor 근사값 (OpenAlex `impact_factor` 또는 `2yr_mean_citedness`). 공식 JCR 아님. NULL = 미수집.';

-- T 태깅 쿼리가 자주 order-by 에 사용하지는 않으므로 전용 인덱스는 생략.
-- priority_score 인덱스가 이미 있고, T 태깅은 프로젝트별 풀스캔.

-- ============================================================
-- DOWN (rollback)
-- ============================================================
-- alter table reference_papers
--   drop column if exists citation_count,
--   drop column if exists impact_factor;
