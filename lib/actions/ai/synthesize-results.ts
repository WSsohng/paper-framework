'use server'

import { generateJson } from '@/lib/ai/generate'
import type { PaperVerification } from './verify-papers'
import type { FoundPaper } from '@/lib/actions/search/search-papers'

// ── 타입 ──────────────────────────────────────────────────

export interface SearchResultGroup {
  search_id: string
  purpose:   string
  papers:    FoundPaper[]
}

// ── 액션 ──────────────────────────────────────────────────

/**
 * 다중 검색 전략(gap_analysis, comparison 등)으로 수집된 논문들을
 * 원본 연구 질문 기준으로 통합 평가한다.
 *
 * gap_analysis: s1 논문 중 s2에 없는 기법 → direct, s2는 맥락 참조 → partial
 * comparison:   각 그룹 논문을 원래 질문 기준으로 평가
 *
 * 단일 검색(direct_search)은 이 함수를 거치지 않고 verifyPaperRelevance 사용.
 */
export async function synthesizeSearchResults(
  researchQuestion:     string,
  researchIntent:       string,
  flatPapers:           FoundPaper[],          // 중복 제거된 전체 논문 (인덱스 기준)
  searchGroups:         SearchResultGroup[],   // 검색별 원본 결과
  synthesisInstruction: string,
  projectId?:           string,
): Promise<PaperVerification[]> {
  if (flatPapers.length === 0) return []

  const batch = flatPapers.slice(0, 30)

  // 검색별 그룹 맵: semanticId → search_id
  const paperSearchMap = new Map<string, string>()
  for (const group of searchGroups) {
    for (const paper of group.papers) {
      if (!paperSearchMap.has(paper.semanticId)) {
        paperSearchMap.set(paper.semanticId, group.search_id)
      }
    }
  }

  // 검색 그룹 설명 (Claude에게 컨텍스트 제공)
  const groupDesc = searchGroups
    .map((g) => `  ${g.search_id} (${g.purpose}): ${g.papers.length}편 검색됨`)
    .join('\n')

  // 각 논문에 어느 검색에서 나왔는지 태그
  const paperListStr = batch
    .map((p, i) => {
      const sid     = paperSearchMap.get(p.semanticId) ?? 'unknown'
      const group   = searchGroups.find((g) => g.search_id === sid)
      const srcNote = group ? `[출처: ${sid} — ${group.purpose}]` : ''
      return (
        `[${i}] ${srcNote} "${p.title}"` +
        (p.year    ? ` (${p.year})` : '') +
        (p.journal ? ` — ${p.journal}` : '') +
        (p.abstract ? `\n    Abstract: ${p.abstract.slice(0, 400)}` : '')
      )
    })
    .join('\n\n')

  const prompt = `
당신은 학술 문헌 합성 전문가입니다.
다중 검색 전략으로 수집된 논문들을 원래 연구 질문 기준으로 통합 평가하세요.

[프로젝트 Research Intent]
${researchIntent || '(없음)'}

[원래 연구 질문]
${researchQuestion}

[검색 전략 구성]
${groupDesc}

[합성 지시사항]
${synthesisInstruction}

[수집된 논문 목록]
${paperListStr}

각 논문에 대해 아래 JSON 배열로만 응답 (인덱스 순서 유지):
[
  {
    "index": 0,
    "match": "direct" | "partial" | "unrelated",
    "note": "판단 근거 (한국어, 한 문장)"
  },
  ...
]

판정 기준:
- direct   : 연구 질문의 핵심 목적을 직접 충족하는 논문.
  · gap_analysis: s1 출처이고, s2에서 다루지 않는 신기법을 제시하는 논문 → 갭 후보
  · comparison: 비교 대상 기술을 실질적으로 다루는 논문
- partial  : 관련은 있으나 핵심이 아닌 논문.
  · gap_analysis: s2 출처(현재 적용 현황) 또는 간접 관련 s1 논문
  · 배경·맥락 참고용
- unrelated: 질문 의도와 실질적으로 다른 논문 (키워드만 겹침)

⚠ gap_analysis 특수 규칙:
- s1 출처 논문 중 새로운 AI 기법 → direct, note에 "○○ 기법 미적용 gap" 명시
- s2 출처 논문 → partial, note에 "기존 적용 사례 (맥락)" 명시
- s1 출처이지만 이미 s2와 동일 기술 → partial 또는 unrelated

JSON 배열만 반환, 마크다운 없이.
`.trim()

  try {
    const results = await generateJson<PaperVerification[]>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'search_synthesis', projectId },
    })

    if (!Array.isArray(results)) return batch.map((_, i) => defaultVerification(i))

    const map = new Map(results.map((r) => [r.index, r]))
    return batch.map((_, i) => map.get(i) ?? defaultVerification(i))
  } catch {
    return batch.map((_, i) => defaultVerification(i))
  }
}

function defaultVerification(index: number): PaperVerification {
  return { index, match: 'partial', note: '자동 합성 불가' }
}
