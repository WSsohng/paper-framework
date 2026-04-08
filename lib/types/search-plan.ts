/** 단일 검색 쿼리 (API에 직접 전달될 영문 쿼리) */
export interface SearchQuery {
  id:               string    // "s1", "s2"
  purpose:          string    // 이 검색의 목적 (한국어)
  query:            string    // API 검색어 (영문 키워드) — 주 쿼리
  query_variations: string[]  // 동일 의도를 다른 학술 표현으로 표현한 변형 쿼리 2개
  yearFrom?:        number    // 최소 발행 연도
}

export type SearchQueryType =
  | 'direct_search'   // 특정 주제·방법론 직접 탐색 → 1개 쿼리
  | 'trend_analysis'  // 최신 동향 파악 → 1개 쿼리 (yearFrom 최근 1~2년)
  | 'comparison'      // 두 기술·방법론 병렬 탐색 → 2개 쿼리 (인간이 직접 비교)

export interface SearchPlan {
  query_type:             SearchQueryType
  searches:               SearchQuery[]
  synthesis_instruction:  string    // 결과 합성 방법 지시 (한국어)
  keywords:               string[]  // UI 태그용 대표 키워드
  rationale:              string    // 전략 선택 이유 (한국어)
}
