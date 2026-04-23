-- ============================================================
-- Migration v18 — journal_if_cache 테이블 (M0 IF 필터)
-- ============================================================
-- 배경: M0 Discovery 검색 결과를 IF 로 사전 필터링하려면 저널 IF 값이 필요.
--       OpenAlex `/sources?search=<name>` 는 1저널당 1 HTTP 호출이 필요하고
--       rate-limit(polite pool 10 req/s)이 있어, 같은 저널 반복 조회를 피하려면 캐시가 필수.
--
-- 데이터 소스: OpenAlex `summary_stats.impact_factor`
--             (없으면 `2yr_mean_citedness` 를 fallback 으로 사용 — 공식 JCR IF 의 근사값)
--
-- 키: 정규화된 저널명(소문자·공백 정리). ISSN 은 Semantic Scholar 검색 결과에
--     일관되게 들어오지 않으므로 이름 기반 캐시로 시작. 향후 ISSN 보강 가능.
--
-- null 값도 캐시한다(저널을 찾지 못한 경우 반복 조회 방지).
--   - `impact_factor IS NULL` + `source = 'openalex'` 는 "검색했는데 값 없음" 을 의미.
--   - stale 대책: `cached_at` 으로 90일 이상 경과한 캐시는 클라이언트가 재조회.
-- ============================================================

create table if not exists journal_if_cache (
  journal_name_normalized text        primary key,
  display_name            text        not null,
  impact_factor           numeric(6,3),
  source                  text        not null default 'openalex',
  issn                    text,
  works_count             integer,
  cached_at               timestamptz not null default now()
);

comment on table journal_if_cache is
  'M0 Discovery IF 필터용 저널 IF 캐시. 정규화된 저널명을 키로, OpenAlex IF/citedness 값을 저장.';

comment on column journal_if_cache.journal_name_normalized is
  '키: lower(trim(저널명)) 정규화 형태. 원본 표기는 display_name 참조.';

comment on column journal_if_cache.impact_factor is
  'OpenAlex impact_factor 또는 (없으면) 2yr_mean_citedness. NULL 은 "조회했으나 없음".';

-- 조회 패턴: IN (normalized_names) 단일 쿼리 → PK 자동 인덱스 사용.
-- 만료 검사용 secondary index.
create index if not exists journal_if_cache_cached_at_idx
  on journal_if_cache(cached_at);

-- RLS: 다른 allow-all 패턴과 일관 (단일 사용자 개발 단계).
alter table journal_if_cache enable row level security;
create policy "allow_all_journal_if_cache" on journal_if_cache
  for all using (true) with check (true);

-- ============================================================
-- DOWN (rollback)
-- ============================================================
-- drop table if exists journal_if_cache;
