'use server'

import { generateJson } from '@/lib/ai/generate'
import { AIContextBuilder } from '@/lib/ai/context-builder'
import { composePrompt } from '@/lib/ai/prompt-composer'

export interface TopicRecommendation {
  title:                string   // specific, publishable paper title
  angle:                string   // strategic angle (Korean, ≤15 chars)
  gap:                  string   // research gap addressed (Korean, 2 sentences)
  novelty:              string   // novelty argument (Korean, 1 sentence)
  acceptance_rationale: string   // why a top journal would accept this (Korean, 1 sentence)
  supporting_count:     number   // pool papers that back this topic
  confidence:           number   // 0–100
}

export type TopicResult =
  | { success: true;  data: TopicRecommendation[] }
  | { success: false; error: string }

export interface PoolPaper {
  title:           string
  journal:         string | null
  year:            number | null
  abstract?:       string | null  // AI 관련성 판단에 활용
  relevance?:      string | null  // 'direct' | 'partial' — 이 프로젝트에서의 관련도
  relevance_note?: string | null  // AI 분류 근거 요약
}

export async function recommendTopics(
  projectName:        string,
  researchIntent:     string,
  poolPapers:         PoolPaper[],
  userInsights?:      string[],
  researchQuestions?: string[],
): Promise<TopicResult> {
  // Pool literature를 렌더링 (caller 가 직접 제공하는 파라미터 — DB 조회 없음)
  const paperList = poolPapers
    .slice(0, 80)
    .map((p, i) => {
      const rel  = p.relevance ? ` [${p.relevance}]` : ''
      const note = p.relevance_note ? ` — ${p.relevance_note}` : ''
      const abst = p.abstract ? `\n   Abstract: ${p.abstract.slice(0, 200)}` : ''
      return `${i + 1}.${rel} ${p.title}${p.year ? ` (${p.year})` : ''}${p.journal ? ` — ${p.journal}` : ''}${note}${abst}`
    })
    .join('\n\n')

  const builder = new AIContextBuilder({ lang: 'en' })
    .withCustom({
      id:    'project_meta',
      title: 'Project',
      body:  `Name: ${projectName}\nResearch Intent: ${researchIntent}`,
    })

  if (researchQuestions && researchQuestions.length) {
    builder.withUserInsights(
      researchQuestions,
      'Research Questions Explored So Far (reflect the researcher\'s thought trajectory)',
    )
  }
  if (userInsights && userInsights.length) {
    builder.withUserInsights(
      userInsights,
      'Researcher Insights (human expert intuition — let these guide topic selection)',
    )
  }

  builder.withCustom({
    id:    'literature_pool',
    title: `Literature Pool (${poolPapers.length} papers, [direct] = highly relevant)`,
    body:  paperList,
  })

  const { sections } = await builder.build()

  const prompt = composePrompt(
    {
      lang:      'en',
      role:      'You are an expert academic research strategist.',
      objective: 'Identify 4 publishable paper topics from the given literature pool.',
      reasoning: [
        'STEP 1 — MAP THE LANDSCAPE: identify clusters, dominant methods, key debates, and obvious white spaces. Pay special attention to [direct]-tagged papers — they represent what the researcher found most relevant.',
        'STEP 2 — FIND DEFENSIBLE GAPS: cross-reference the research questions explored so far with the landscape map. Identify gaps that (a) are not covered by existing papers, (b) align with the researcher\'s trajectory, (c) could be addressed with the methods visible in the pool.',
        'STEP 3 — DRAFT 4 PUBLISHABLE TOPICS: for each topic ensure a concrete hypothesis, a novel angle, a clear gap, and a reason a top journal would accept it.',
      ],
      output: {
        kind:  'array',
        shape: `{
    "title": "Specific publishable paper title",
    "angle": "핵심 전략 관점 (Korean, max 15 chars)",
    "gap": "이 논문이 채우는 연구 공백 (Korean, 2 sentences)",
    "novelty": "이 연구가 새로운 이유 (Korean, 1 sentence)",
    "acceptance_rationale": "상위 저널이 이 논문을 채택할 이유 (Korean, 1 sentence)",
    "supporting_count": 12,
    "confidence": 85
  }`,
        count:   { exact: 4 },
        orderBy: 'confidence descending',
      },
    },
    { sections },
  )

  try {
    const list = await generateJson<TopicRecommendation[]>(prompt, 0.5, {
      meta: { feature: 'topic_recommendation' },
    })
    if (!Array.isArray(list) || !list.length) {
      return { success: false, error: '주제 추천 실패. 다시 시도해 주세요.' }
    }
    return { success: true, data: list.slice(0, 4) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
