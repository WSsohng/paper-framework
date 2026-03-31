'use server'

import OpenAI from 'openai'

export interface TopicRecommendation {
  title:              string   // specific, publishable paper title
  angle:              string   // one-line strategic angle (Korean)
  gap:                string   // research gap addressed (Korean, 2 sentences)
  novelty:            string   // novelty argument (Korean, 1 sentence)
  supporting_count:   number   // estimated pool papers that back this topic
  confidence:         number   // 0–100
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
): Promise<TopicResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    return { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }
  }

  const client = new OpenAI({ apiKey })

  // Compact paper list for prompt — keep token count manageable
  const paperList = poolPapers
    .slice(0, 80)
    .map((p, i) => `${i + 1}. ${p.title}${p.year ? ` (${p.year})` : ''}${p.journal ? ` — ${p.journal}` : ''}`)
    .join('\n')

  const prompt = `You are an expert academic research advisor analyzing a literature pool to identify publishable paper topics.

Project: ${projectName}
Research Intent: ${researchIntent}

Literature Pool (${poolPapers.length} papers):
${paperList}

Based on the patterns, gaps, and convergence points in this literature pool, recommend exactly 4 specific, publishable paper topics.

Each topic must:
- Have a concrete, compelling paper title (not vague — specific enough to search for)
- Address a real research gap visible in the pool
- Be feasible to execute based on what the pool covers
- Be sufficiently novel to be publishable

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
    const response = await client.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      temperature:     0.5,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { success: false, error: 'AI 응답 파싱 실패. 다시 시도해 주세요.' }
    }

    const list: TopicRecommendation[] = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).topics as TopicRecommendation[]
        ?? (parsed as Record<string, unknown>).data as TopicRecommendation[]
        ?? []

    if (!list.length) {
      return { success: false, error: '주제 추천 실패. 다시 시도해 주세요.' }
    }

    return { success: true, data: list.slice(0, 4) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }
}
