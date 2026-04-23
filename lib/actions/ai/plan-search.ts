'use server'

/**
 * 중요: Turbopack (Next.js 16) 은 `'use server'` 파일에서 타입 re-export
 *   (`export type { ... }`) 조차 런타임 바인딩으로 해석해 `ReferenceError`
 *   를 발생시킨다. 따라서 이 파일에서는 **async 함수만** export 하고,
 *   SearchPlan 등 타입은 consumer 가 `@/lib/types/search-plan` 에서 직접
 *   import 해야 한다.
 */

import { generateJson } from '@/lib/ai/generate'
import type { ActionResult } from '@/lib/types'
import type { SearchPlan, SearchQuery, SearchQueryType } from '@/lib/types/search-plan'

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
      "query_variations": [
        "주 쿼리와 동일 의도의 학술 동의어 표현 1",
        "주 쿼리와 동일 의도의 학술 동의어 표현 2"
      ],
      "year_from": ${currentYear - 3}
    }
  ],
  "synthesis_instruction": "검색 결과를 어떻게 종합·해석할지 지시 (한국어, 2~3문장)",
  "keywords": ["대표 키워드1", "키워드2"],
  "rationale": "이 전략을 선택한 이유 (한국어, 한 문장)"
}

===== query_type 판단 기준 =====

direct_search — 특정 주제·방법론 논문을 직접 탐색할 때. searches 1개.
  예: "Transformer를 NIR 분광분석에 적용한 최신 연구"
  예: "sampling methods AI spectroscopy recent"

trend_analysis — 특정 분야의 최신 동향 파악. searches 1개, year_from을 최근 1~2년으로.
  예: "2024년 이후 분광분석 AI 방법론 동향"

comparison — 서로 다른 두 분야·방법론을 병렬 탐색, 연구자가 직접 비교·판단.
  searches 2개, 각각 독립적인 direct 탐색:
    s1: 첫 번째 분야·방법론
    s2: 두 번째 분야·방법론
  예: "최근 AI 샘플링 기법" + "분석화학 기계학습 응용" → 각각 독립 탐색 후 연구자가 융합 포인트 판단
  예: "CNN spectroscopy" + "Transformer spectroscopy"

⚠ gap_analysis는 지원하지 않습니다.
  "A 분야 중 B에 미적용된 것"류 질문은 comparison으로 전환하세요.
  융합 가능성 판단은 검색 결과를 보고 연구자가 직접 결정합니다.

===== search query 작성 규칙 =====
- 반드시 영어, 명사형 키워드 조합 (자연어 문장 X)
- 좋음: "vision transformer spectral analysis"
- 나쁨: "How does vision transformer work for spectral analysis?"
- gap_analysis s1: target domain(B)의 키워드 절대 포함 금지
- year_from: ${currentYear - 3}~${currentYear - 6} 범위, 분야 특성에 맞게

===== query_variations 작성 규칙 =====
- 반드시 2개, query와 의미적으로 동등하지만 학술 표현이 다른 쿼리
- 동의어, 상위/하위 개념, 다른 분야 명칭 활용
- 예) query: "transformer spectroscopy" →
       variations: ["attention mechanism chemical analysis", "self-attention NIR prediction"]
`.trim()

  try {
    const raw = await generateJson<{
      query_type:            string
      searches:              { id: string; purpose: string; query: string; query_variations?: string[]; year_from?: number }[]
      synthesis_instruction: string
      keywords:              string[]
      rationale:             string
    }>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'search_plan', projectId },
    })

    const searches: SearchQuery[] = (raw.searches ?? []).map((s) => ({
      id:               s.id               ?? 's1',
      purpose:          s.purpose          ?? '',
      query:            s.query            ?? researchQuestion.slice(0, 100),
      query_variations: Array.isArray(s.query_variations) ? s.query_variations.filter(Boolean).slice(0, 2) : [],
      yearFrom:         s.year_from && s.year_from > currentYear - 10 ? s.year_from : undefined,
    }))

    if (searches.length === 0) throw new Error('no searches returned')

    // gap_analysis는 지원 종료 → direct_search로 대체
    const VALID_TYPES = ['direct_search', 'trend_analysis', 'comparison'] as const
    const queryType = VALID_TYPES.includes(raw.query_type as typeof VALID_TYPES[number])
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
          id:               's1',
          purpose:          '직접 탐색',
          query:            researchQuestion.slice(0, 100),
          query_variations: [],
        }],
        synthesis_instruction: '검색 결과를 원래 질문 기준으로 관련성 평가',
        keywords:              [],
        rationale:             '자동 계획 생성 실패 — 기본 단일 검색으로 대체',
      },
    }
  }
}
