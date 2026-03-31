'use server'

import OpenAI from 'openai'
import { AI_PROTOCOL_PREAMBLE } from '@/lib/framework-philosophy'

export interface SearchDirection {
  keyword:   string  // actual search query phrase (English)
  direction: string  // short label in Korean
  rationale: string  // why relevant (Korean, 1 sentence)
}

export type KeywordResult =
  | { success: true;  data: SearchDirection[] }
  | { success: false; error: string }

export async function generateSearchKeywords(
  projectName: string,
  researchIntent: string,
): Promise<KeywordResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    return { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }
  }

  const client = new OpenAI({ apiKey })

  const prompt = `${AI_PROTOCOL_PREAMBLE}

---

You are a research strategist helping plan a systematic literature review.

Project: ${projectName}
Research Intent: ${researchIntent}

Generate exactly 8 targeted search keyword phrases for finding relevant academic papers on Semantic Scholar, Scopus, and Web of Science.

Rules:
- Each keyword must be 2–5 words, specific and directly searchable
- Cover different angles: core method, application domain, related technique, theoretical foundation, evaluation benchmark, etc.
- Write all keywords in English for maximum database coverage
- Each keyword must be distinct and non-overlapping
- Avoid overly broad terms like "machine learning" or "artificial intelligence" alone

Return ONLY a valid JSON array of exactly 8 objects:
[
  {
    "keyword": "exact search phrase in English",
    "direction": "검색 방향 (Korean, max 12 chars)",
    "rationale": "왜 이 키워드가 이 연구에 중요한지 한 문장으로 (Korean)"
  }
]

No markdown, no explanation — pure JSON only.`

  try {
    const response = await client.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      temperature:     0.3,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { success: false, error: 'AI 응답 파싱 실패. 다시 시도해 주세요.' }
    }

    const list: SearchDirection[] = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).keywords as SearchDirection[]
        ?? (parsed as Record<string, unknown>).data as SearchDirection[]
        ?? []

    if (!list.length) {
      return { success: false, error: '키워드 생성 실패. 다시 시도해 주세요.' }
    }

    return { success: true, data: list.slice(0, 8) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }
}
