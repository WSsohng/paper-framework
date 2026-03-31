'use server'

import OpenAI from 'openai'

export interface ResearchQuestion {
  question: string   // full search sentence in English
  angle:    string   // strategic label (Korean, ≤12 chars)
  focus:    string   // what insight this angle surfaces (Korean, 1 sentence)
}

export type QuestionResult =
  | { success: true;  data: ResearchQuestion[] }
  | { success: false; error: string }

export interface SearchHistoryItem {
  question:     string
  paperTitles:  string[]  // first few titles found
}

export async function generateResearchQuestions(
  projectName: string,
  researchIntent: string,
  history?: SearchHistoryItem[],  // if provided → generate follow-up questions
): Promise<QuestionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    return { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }
  }

  const client = new OpenAI({ apiKey })

  const isFollowUp = history && history.length > 0

  const historySection = isFollowUp
    ? `\nSearch history so far:\n${history
        .map((h, i) =>
          `Round ${i + 1}: "${h.question}"\n  Found papers (sample): ${h.paperTitles.slice(0, 5).join(' | ')}`,
        )
        .join('\n')}\n`
    : ''

  const taskDescription = isFollowUp
    ? `Based on the search history above, generate 5 FOLLOW-UP research questions that:
- Dig deeper into gaps or patterns visible in the papers found so far
- Explore adjacent angles NOT yet covered by previous searches
- Refine or extend the most promising directions observed
- Do NOT repeat questions already asked`
    : `Generate exactly 5 strategic research questions for finding relevant academic papers.

Each question must:
1. Be a COMPLETE SENTENCE (not just keywords) suitable for an academic search engine
2. Carry a clear strategic angle — choose one per question:
   - Citation impact: "Which approaches have the highest citation count/impact in..."
   - Recency & trend: "What are the most recent advances (last 3 years) in..."
   - Methodological comparison: "How do [method A] compare to [method B] for..."
   - Application gap: "What challenges remain unsolved when applying [X] to [Y]..."
   - Foundational theory: "What theoretical frameworks underpin [core concept] in..."
3. Be specific enough to yield 10–40 focused papers
4. Cover DIFFERENT aspects of the research — do NOT overlap`

  const prompt = `You are a research strategist designing a systematic literature review.

Project: ${projectName}
Research Intent: ${researchIntent}
${historySection}
${taskDescription}

Return ONLY a valid JSON array of exactly 5 objects:
[
  {
    "question": "Full research question sentence in English",
    "angle": "전략적 관점 레이블 (Korean, max 10 chars)",
    "focus": "이 질문이 어떤 인사이트를 탐색하는지 한 문장 (Korean)"
  }
]

No markdown, no explanation — pure JSON only.`

  try {
    const response = await client.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      temperature:     0.4,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { success: false, error: 'AI 응답 파싱 실패. 다시 시도해 주세요.' }
    }

    const list: ResearchQuestion[] = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).questions as ResearchQuestion[]
        ?? (parsed as Record<string, unknown>).data as ResearchQuestion[]
        ?? []

    if (!list.length) {
      return { success: false, error: '질문 생성 실패. 다시 시도해 주세요.' }
    }

    return { success: true, data: list.slice(0, 5) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }
}
