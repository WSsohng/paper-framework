'use server'

import { generateJson } from '@/lib/ai/generate'

export interface TopicRecommendation {
  title:            string   // specific, publishable paper title
  angle:            string   // strategic angle (Korean, ≤15 chars)
  gap:              string   // research gap addressed (Korean, 2 sentences)
  novelty:          string   // novelty argument (Korean, 1 sentence)
  supporting_count: number   // pool papers that back this topic
  confidence:       number   // 0–100
}

export type TopicResult =
  | { success: true;  data: TopicRecommendation[] }
  | { success: false; error: string }

export interface PoolPaper {
  title:   string
  journal: string | null
  year:    number | null
}

export async function recommendTopics(
  projectName: string,
  researchIntent: string,
  poolPapers: PoolPaper[],
  userInsights?: string[],   // accumulated researcher insights
): Promise<TopicResult> {
  const paperList = poolPapers
    .slice(0, 80)
    .map((p, i) =>
      `${i + 1}. ${p.title}${p.year ? ` (${p.year})` : ''}${p.journal ? ` — ${p.journal}` : ''}`,
    )
    .join('\n')

  const insightsSection =
    userInsights && userInsights.length > 0
      ? `\nResearcher's accumulated insights (these reflect the human expert's intuition — prioritize topics that align with these):\n${userInsights
          .map((ins, i) => `${i + 1}. "${ins}"`)
          .join('\n')}\n`
      : ''

  const prompt = `You are an expert academic research advisor identifying publishable paper topics from a literature pool.

Project: ${projectName}
Research Intent: ${researchIntent}
${insightsSection}
Literature Pool (${poolPapers.length} papers):
${paperList}

Analyze the patterns, convergence points, and gaps in this literature pool. The researcher's insights above represent human intuition and domain expertise — let them guide topic selection.

Recommend exactly 4 specific, publishable paper topics that:
- Address genuine research gaps visible in the pool
- Align with the researcher's insights and intent
- Are feasible to execute based on what the pool covers
- Are novel enough to be publishable in a top-tier journal

Return ONLY a valid JSON array of exactly 4 objects:
[
  {
    "title": "Specific publishable paper title",
    "angle": "핵심 전략 관점 (Korean, max 15 chars)",
    "gap": "이 논문이 채우는 연구 공백 (Korean, 2 sentences)",
    "novelty": "이 연구가 새로운 이유 (Korean, 1 sentence)",
    "supporting_count": 12,
    "confidence": 85
  }
]

Order by confidence descending. No markdown — pure JSON only.`

  try {
    const list = await generateJson<TopicRecommendation[]>(prompt, 0.5)
    if (!Array.isArray(list) || !list.length) {
      return { success: false, error: '주제 추천 실패. 다시 시도해 주세요.' }
    }
    return { success: true, data: list.slice(0, 4) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
