'use server'

import OpenAI from 'openai'
import { AI_PROTOCOL_PREAMBLE } from '@/lib/framework-philosophy'

export type FitLevel = 'optimal' | 'adequate' | 'insufficient' | 'excessive'
// optimal    = 범위·수준 딱 맞음
// adequate   = 투고 가능하나 약간 아쉬운 부분 있음
// insufficient = 연구 수준/범위가 이 저널 기대치에 미치지 못함
// excessive  = 저널이 이 연구보다 훨씬 넓은 범위를 요구 (over-scoped)

export interface JournalRecommendation {
  name:           string
  publisher:      string
  impact_factor:  number | null
  issn:           string | null
  scope:          string
  insight:        string
  fit_score:      number     // 0–100
  fit_level:      FitLevel   // 적절/부족/과잉 판단
  fit_reason:     string     // 왜 이 fit_level인지 (Korean, 1-2 sentences)
  website:        string | null
}

export type RecommendationResult =
  | { success: true;  data: JournalRecommendation[] }
  | { success: false; error: string }

export async function recommendJournals(
  projectName: string,
  researchIntent: string,
): Promise<RecommendationResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    return { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }
  }

  const client = new OpenAI({ apiKey })

  const prompt = `${AI_PROTOCOL_PREAMBLE}

---

You are an expert academic journal consultant with deep knowledge of scientific publishing.

Based on the following research project, recommend exactly 10 suitable journals for manuscript submission.

Project Name: ${projectName}
Research Intent: ${researchIntent}

Requirements:
- Include a mix of high-impact journals (IF > 10) and accessible journals (IF 3–10)
- Prioritize journals that genuinely fit the research topic
- Include journals from relevant fields (consider interdisciplinary options)
- Provide realistic impact factor estimates based on recent data (use null if unknown)

Return ONLY a valid JSON array with exactly 10 objects in this structure:
[
  {
    "name": "Full journal name",
    "publisher": "Publisher name",
    "impact_factor": 15.2,
    "issn": "1234-5678",
    "scope": "2–3 sentence description of what this journal covers",
    "insight": "1–2 sentence explanation of why this journal fits this specific research",
    "fit_score": 92,
    "fit_level": "optimal | adequate | insufficient | excessive",
    "fit_reason": "Korean: 1-2 sentences on exactly why this fit level — e.g. 연구 범위가 저널이 요구하는 수준보다 좁아 보완이 필요합니다.",
    "website": "https://..."
  }
]

fit_level rules:
- optimal: scope, depth, novelty all well-matched
- adequate: publishable but researcher should strengthen 1-2 aspects
- insufficient: the research as described doesn't meet the journal's expectations (scope too narrow, novelty insufficient, etc.)
- excessive: the journal covers much broader territory than this specific research

Order by fit_score descending. No markdown, no explanation — pure JSON only.`

  try {
    const response = await client.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''

    // JSON 파싱 — 배열 또는 { journals: [...] } 형태 모두 처리
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { success: false, error: 'AI 응답 파싱 실패. 다시 시도해 주세요.' }
    }

    const list: JournalRecommendation[] = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).journals as JournalRecommendation[]
        ?? (parsed as Record<string, unknown>).data as JournalRecommendation[]
        ?? []

    if (!list.length) {
      return { success: false, error: 'AI가 추천 결과를 반환하지 않았습니다. 다시 시도해 주세요.' }
    }

    return { success: true, data: list.slice(0, 10) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }
}
