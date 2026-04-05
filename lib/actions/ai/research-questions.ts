'use server'

import { generateJson } from '@/lib/ai/generate'

export interface ResearchQuestion {
  question: string   // full search sentence in English
  angle:    string   // strategic label (Korean, ≤10 chars)
  focus:    string   // what insight this angle surfaces (Korean, 1 sentence)
}

export interface SearchHistoryItem {
  question:     string
  paperTitles:  string[]
  user_insight: string | null   // researcher's own annotation
}

export type QuestionResult =
  | { success: true;  data: ResearchQuestion[] }
  | { success: false; error: string }

export async function generateResearchQuestions(
  projectName: string,
  researchIntent: string,
  history?: SearchHistoryItem[],
): Promise<QuestionResult> {
  const isFollowUp = history && history.length > 0

  const historySection = isFollowUp
    ? `\nResearch history so far:\n${history
        .map((h, i) => {
          const insightLine = h.user_insight
            ? `  Researcher's insight: "${h.user_insight}"`
            : ''
          return `Round ${i + 1}: "${h.question}"\n  Papers found (sample): ${h.paperTitles.slice(0, 5).join(' | ')}${insightLine}`
        })
        .join('\n')}\n`
    : ''

  const insightsSummary = isFollowUp
    ? history!
        .filter((h) => h.user_insight)
        .map((h) => `"${h.user_insight}"`)
        .join('; ')
    : ''

  const insightContext = insightsSummary
    ? `\nKey researcher insights accumulated: ${insightsSummary}\nThese insights represent the researcher's intuition — new questions should align with and deepen these perspectives.\n`
    : ''

  const taskDescription = isFollowUp
    ? `Based on the search history and researcher insights above, generate 5 FOLLOW-UP research questions that:
- Build on patterns and gaps visible in the papers found so far
- Reflect and deepen the researcher's accumulated insights
- Explore angles NOT yet covered by previous searches
- Drive toward a more specific and novel research direction
- Do NOT repeat questions already asked`
    : `Generate exactly 5 strategic research questions for finding relevant academic papers.

Each question must:
1. Be a COMPLETE SENTENCE suitable for an academic search engine (not just keywords)
2. Carry a clear strategic angle — one per question:
   - Citation impact: "Which approaches achieve highest impact in..."
   - Recency & trend: "What are the most recent advances (last 2 years) in..."
   - Methodological gap: "What limitations exist in current methods for..."
   - Application bridge: "How is [technique] being applied to [domain] and what results..."
   - Comparative analysis: "How do [A] and [B] compare in terms of [metric]..."
3. Be specific enough to yield 10–40 focused papers
4. Cover DIFFERENT aspects of the research intent`

  const prompt = `You are a research strategist designing a systematic literature review. Your goal is to help the researcher discover the literature that will lead to an impactful, novel paper.

Project: ${projectName}
Research Intent: ${researchIntent}
${historySection}${insightContext}
${taskDescription}

Return ONLY a valid JSON array of exactly 5 objects:
[
  {
    "question": "Full research question sentence in English",
    "angle": "전략적 관점 (Korean, max 10 chars)",
    "focus": "이 질문이 탐색하는 인사이트 (Korean, 1 sentence)"
  }
]

No markdown, no explanation — pure JSON only.`

  try {
    const list = await generateJson<ResearchQuestion[]>(prompt, 0.4, { meta: { feature: 'research_questions' } })
    if (!Array.isArray(list) || !list.length) {
      return { success: false, error: '질문 생성 실패. 다시 시도해 주세요.' }
    }
    return { success: true, data: list.slice(0, 5) }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return { success: false, error: 'API 요청 한도에 도달했습니다. 30초 후 다시 시도해 주세요.' }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
