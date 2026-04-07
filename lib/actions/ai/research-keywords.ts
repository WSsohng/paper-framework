'use server'

import { generateJson } from '@/lib/ai/generate'
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
    const list = await generateJson<SearchDirection[]>(prompt, 0.3, {
      skipFrameworkProtocol: true,
      meta: { feature: 'search_keywords' },
    })
    if (!Array.isArray(list) || !list.length) {
      return { success: false, error: '키워드 생성 실패. 다시 시도해 주세요.' }
    }
    return { success: true, data: list.slice(0, 8) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }
}
