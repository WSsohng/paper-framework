'use server'

import { generateJson } from '@/lib/ai/generate'
import type { ActionResult } from '@/lib/types'

// ── 타입 ──────────────────────────────────────────────────

/** 단일 검색 쿼리 (API에 직접 전달될 영문 쿼리) */
export interface SearchQuery {
  id:        string        // "s1", "s2"
  purpose:   string        // 이 검색의 목적 (한국어)
  query:     string        // API 검색어 (영문 키워드)
  yearFrom?: number        // 최소 발행 연도
}

export type SearchQueryType =
  | 'direct_search'   // 단순 교집합 → 1개 쿼리
  | 'gap_analysis'    // 차집합: "A 중 B 미적용" → 2개 쿼리
  | 'trend_analysis'  // 최신 동향 → 1개 쿼리 + 최신순 강화
  | 'comparison'      // A vs B 비교 → 2개 쿼리

export interface SearchPlan {
  query_type:             SearchQueryType
  searches:               SearchQuery[]
  synthesis_instruction:  string    // 결과 합성 방법 지시 (한국어)
  keywords:               string[]  // UI 태그용 대표 키워드
  rationale:              string    // 전략 선택 이유 (한국어)
}

// ── 액션 ──────────────────────────────────────────────────

/**
 * 연구 질문의 의도를 분석해 최적의 다중 검색 전략을 수립.
 *
 * 단순 키워드 교집합 검색 대신 질문 유형(gap_analysis, comparison 등)을
 * 판별하고, 그에 맞는 독립적인 서브쿼리 배열을 반환합니다.
 */
export async function planSearch(
  researchQuestion: string,
  researchIntent:   string,
  projectId?:       string,
): Promise<ActionResult<SearchPlan>> {
  const currentYear = new Date().getFullYear()

  const prompt = `
당신은 학술 논문 검색 전략 전문가입니다.
연구 질문의 의도를 정확히 파악하고 최적의 검색 계획을 수립하세요.

[프로젝트 Research Intent]
${researchIntent || '(없음)'}

[연구 질문]
${researchQuestion}

아래 JSON 형식으로만 응답:
{
  "query_type": "direct_search" | "gap_analysis" | "trend_analysis" | "comparison",
  "searches": [
    {
      "id": "s1",
      "purpose": "이 검색의 목적 (한국어, 한 문장)",
      "query": "API에 보낼 영문 검색어 (2~5개 핵심 명사형 용어)",
      "year_from": ${currentYear - 3}
    }
  ],
  "synthesis_instruction": "검색 결과를 어떻게 종합·해석할지 지시 (한국어, 2~3문장)",
  "keywords": ["대표 키워드1", "키워드2"],
  "rationale": "이 전략을 선택한 이유 (한국어, 한 문장)"
}

===== query_type 판단 기준 =====

direct_search — 특정 주제·방법론 논문을 직접 탐색할 때. searches 1개.
  예: "Transformer를 NIR 분광분석에 적용한 최신 연구 찾기"

gap_analysis — "A 기술 중 B 분야에 아직 적용 안 된 것" 또는 "B 분야가 놓친 A 기법" 파악.
  searches 2개 필수:
    s1: A 기술 단독 탐색 (B 관련 키워드 절대 포함 금지)
    s2: A+B 교집합 탐색 (현재 적용 현황 파악용)
  예: "AI 최신 기법 중 분광분석에 미적용된 기술" → s1: "foundation model deep learning 2023", s2: "machine learning spectroscopy"

trend_analysis — 특정 분야 최신 동향 파악. searches 1개, year_from을 최근 1~2년으로.
  예: "2024년 이후 분광분석 최신 방법론 동향"

comparison — 두 기술·방법론 비교·대조. searches 2개.
  s1: 첫 번째 기술/방법론
  s2: 두 번째 기술/방법론
  예: "CNN vs Transformer in spectroscopy"

===== search query 작성 규칙 =====
- 반드시 영어, 명사형 키워드 조합 (자연어 문장 X)
- 좋음: "vision transformer spectral analysis"
- 나쁨: "How does vision transformer work for spectral analysis?"
- gap_analysis s1: target domain(B)의 키워드 절대 포함 금지
- year_from: ${currentYear - 3}~${currentYear - 6} 범위, 분야 특성에 맞게
`.trim()

  try {
    const raw = await generateJson<{
      query_type:            string
      searches:              { id: string; purpose: string; query: string; year_from?: number }[]
      synthesis_instruction: string
      keywords:              string[]
      rationale:             string
    }>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'search_plan', projectId },
    })

    const searches: SearchQuery[] = (raw.searches ?? []).map((s) => ({
      id:       s.id       ?? 's1',
      purpose:  s.purpose  ?? '',
      query:    s.query    ?? researchQuestion.slice(0, 100),
      yearFrom: s.year_from && s.year_from > currentYear - 10 ? s.year_from : undefined,
    }))

    if (searches.length === 0) throw new Error('no searches returned')

    const queryType = (['direct_search','gap_analysis','trend_analysis','comparison'] as const)
      .includes(raw.query_type as SearchQueryType)
      ? (raw.query_type as SearchQueryType)
      : 'direct_search'

    return {
      success: true,
      data: {
        query_type:            queryType,
        searches,
        synthesis_instruction: raw.synthesis_instruction ?? '',
        keywords:              Array.isArray(raw.keywords) ? raw.keywords : [],
        rationale:             raw.rationale ?? '',
      },
    }
  } catch {
    // AI 실패 시 fallback: 단일 direct_search
    return {
      success: true,
      data: {
        query_type:            'direct_search',
        searches: [{
          id:      's1',
          purpose: '직접 탐색',
          query:   researchQuestion.slice(0, 100),
        }],
        synthesis_instruction: '검색 결과를 원래 질문 기준으로 관련성 평가',
        keywords:              [],
        rationale:             '자동 계획 생성 실패 — 기본 단일 검색으로 대체',
      },
    }
  }
}
