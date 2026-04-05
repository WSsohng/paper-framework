'use server'

import { generateJson } from '@/lib/ai/generate'
import type { ActionResult } from '@/lib/types'

// ── 타입 ──────────────────────────────────────────────────

export interface KeywordExtractResult {
  /** Semantic Scholar에 직접 던질 최적화된 검색 쿼리 (2~5 핵심 용어 조합) */
  search_query: string
  /** 화면에 표시할 개별 키워드 태그 */
  keywords: string[]
  /**
   * 권장 최소 발행 연도.
   * - 최신 방법론·모델 연구라면 최근 2~3년 (e.g. 2022)
   * - 기초 개념·메타분석이라면 더 넓게 (e.g. 2018)
   */
  year_from: number
  /** 키워드 선택 이유 (한 문장, UI 툴팁용) */
  rationale: string
}

// ── 액션 ──────────────────────────────────────────────────

/**
 * 자연어 연구 질문을 Semantic Scholar 최적화 검색 쿼리 + 키워드로 변환.
 * 전체 질문문 그대로 검색하는 것보다 관련 논문 발견율이 크게 향상됩니다.
 */
export async function extractSearchKeywords(
  researchQuestion: string,
  researchIntent: string,
  projectId?: string,
): Promise<ActionResult<KeywordExtractResult>> {
  const currentYear = new Date().getFullYear()

  const prompt = `
당신은 학술 논문 검색 전문가입니다.
아래 연구 질문을 Semantic Scholar 학술 데이터베이스 검색에 최적화된 키워드로 변환하세요.

[프로젝트 Research Intent]
${researchIntent}

[연구 질문]
${researchQuestion}

아래 JSON 형식으로만 응답:
{
  "search_query": "Semantic Scholar에 입력할 검색 쿼리 (영어, 2~5개 핵심 용어, 공백으로 구분)",
  "keywords": ["키워드1", "키워드2", ...],
  "year_from": ${currentYear - 4},
  "rationale": "이 키워드를 선택한 이유 (한 문장)"
}

규칙:
- search_query: 자연어 질문이 아닌 명사형 키워드/구문 조합. 불필요한 접속사·조동사 제거.
  예시 (좋음): "foundation model near-infrared spectroscopy prediction"
  예시 (나쁨): "How do foundation models improve NIR spectroscopy analysis?"
- keywords: search_query를 구성하는 개별 핵심 단어/구문 (2~6개), 화면 태그용
- year_from: ${currentYear - 3}~${currentYear - 6} 범위에서 연구 분야 특성에 맞게.
  (방법론·모델 연구 → 최근 2~3년, 기초 이론 → 더 넓게)
- rationale: 왜 이 키워드가 핵심인지 구체적으로
`.trim()

  try {
    const result = await generateJson<KeywordExtractResult>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'search_keywords', projectId },
    })

    // 안전 처리: year_from 범위 보정
    const safeYearFrom = Math.max(
      currentYear - 10,
      Math.min(currentYear, result.year_from ?? currentYear - 3),
    )

    return {
      success: true,
      data: {
        search_query: result.search_query ?? researchQuestion.slice(0, 100),
        keywords:     Array.isArray(result.keywords) ? result.keywords : [],
        year_from:    safeYearFrom,
        rationale:    result.rationale ?? '',
      },
    }
  } catch (e) {
    // AI 실패 시 fallback: 질문 앞부분을 쿼리로 사용
    return {
      success: true,
      data: {
        search_query: researchQuestion.slice(0, 120),
        keywords:     [],
        year_from:    currentYear - 3,
        rationale:    '',
      },
    }
  }
}
