'use server'

import { generateJson } from '@/lib/ai/generate'
import { AIContextBuilder } from '@/lib/ai/context-builder'
import { composePrompt } from '@/lib/ai/prompt-composer'
import type { PaperVerification } from './verify-papers'
import type { FoundPaper } from '@/lib/actions/search/semantic-scholar'

export interface SearchResultGroup {
  search_id: string
  purpose:   string
  papers:    FoundPaper[]
}

/**
 * 다중 검색 전략(comparison 등)으로 수집된 논문들을
 * 원본 연구 질문 기준으로 통합 평가한다.
 *
 * comparison: s1·s2 각 그룹 논문을 원래 질문 기준으로 독립 평가
 * 단일 검색(direct_search / trend_analysis)은 verifyPaperRelevance 사용.
 */
export async function synthesizeSearchResults(
  researchQuestion:     string,
  researchIntent:       string,
  flatPapers:           FoundPaper[],
  searchGroups:         SearchResultGroup[],
  synthesisInstruction: string,
  projectId?:           string,
): Promise<PaperVerification[]> {
  if (flatPapers.length === 0) return []

  const batch = flatPapers.slice(0, 60)

  // 검색별 그룹 맵: semanticId → search_id
  const paperSearchMap = new Map<string, string>()
  for (const group of searchGroups) {
    for (const paper of group.papers) {
      if (!paperSearchMap.has(paper.semanticId)) {
        paperSearchMap.set(paper.semanticId, group.search_id)
      }
    }
  }

  const groupDesc = searchGroups
    .map((g) => `  ${g.search_id} (${g.purpose}): ${g.papers.length}편 검색됨`)
    .join('\n')

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

  // 이 액션은 caller 가 모든 데이터를 직접 전달 — DB 조회 없이 custom 섹션만 사용.
  const { sections } = await new AIContextBuilder({ projectId })
    .withCustom({
      id:    'research_intent',
      title: '프로젝트 Research Intent',
      body:  researchIntent || '(없음)',
    })
    .withCustom({
      id:    'research_question',
      title: '원래 연구 질문',
      body:  researchQuestion,
    })
    .withCustom({
      id:    'search_strategy',
      title: '검색 전략 구성',
      body:  groupDesc,
    })
    .withCustom({
      id:    'synthesis_instruction',
      title: '합성 지시사항',
      body:  synthesisInstruction,
    })
    .withCustom({
      id:    'paper_list',
      title: '수집된 논문 목록',
      body:  paperListStr,
    })
    .build()

  const prompt = composePrompt(
    {
      role:      '당신은 학술 문헌 합성 전문가입니다.',
      objective: '다중 검색 전략으로 수집된 논문들을 원래 연구 질문 기준으로 통합 평가하세요. 각 논문을 인덱스 순서 그대로 판정.',
      output: {
        kind:  'array',
        shape: `{
    "index": 0,
    "match": "direct" | "partial" | "unrelated",
    "note": "판단 근거 (한국어, 한 문장)"
  }`,
      },
      notes: [
        'direct   : 연구 질문의 핵심 주제·방법론과 명확히 관련. 각 검색 그룹의 목적에 비춰 핵심 활용 가능. (관련성 있다고 판단되면 direct 선호)',
        'partial  : 간접적으로 관련 있거나 배경·맥락 참고용.',
        'unrelated: 질문 의도와 실질적으로 다른 논문 (명백한 false positive만).',
        '⚠ comparison 검색의 경우: s1·s2 각 그룹의 purpose 에 비춰 해당 그룹에서 핵심적이면 direct 로 판정. 연구자가 두 그룹 결과를 함께 보고 융합 가능성을 직접 판단하므로, 각 그룹 내 관련성만 평가하세요.',
      ],
    },
    { sections },
  )

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
