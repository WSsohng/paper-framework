'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_PROTOCOL_PREAMBLE } from '@/lib/framework-philosophy'

export interface TrendItem {
  trend:       string   // trend title (English)
  label:       string   // short label (Korean, ≤12 chars)
  description: string   // what is happening (Korean, 2 sentences)
  signal:      string   // why it matters for the research (Korean, 1 sentence)
  recency:     'hot' | 'emerging' | 'established'  // how fresh
}

export interface GeminiTrendResult {
  trends:    TrendItem[]
  summary:   string   // overall field status (Korean, 2-3 sentences)
  timestamp: string
}

export type TrendSearchResult =
  | { success: true;  data: GeminiTrendResult }
  | { success: false; error: string }

export async function searchTrends(
  projectName: string,
  researchIntent: string,
): Promise<TrendSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return { success: false, error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `${AI_PROTOCOL_PREAMBLE}

---

You are a research trend analyst. Based on your knowledge, analyze the current state and latest trends in the following research area.

Project: ${projectName}
Research Intent: ${researchIntent}

Identify the 5 most important current research trends relevant to this area.
Focus on developments from approximately the past 1-2 years.

Return ONLY a valid JSON object:
{
  "trends": [
    {
      "trend": "trend name in English",
      "label": "동향 레이블 (Korean, max 12 chars)",
      "description": "무슨 일이 일어나고 있는지 2문장 (Korean)",
      "signal": "이 연구와의 연관성 1문장 (Korean)",
      "recency": "hot | emerging | established"
    }
  ],
  "summary": "이 연구 분야의 전반적인 현황 2-3문장 (Korean)"
}

No markdown, no explanation — pure JSON only.`

  try {
    const result = await model.generateContent(prompt)
    const text   = result.response.text()

    // Extract JSON
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const raw = codeBlock ? codeBlock[1].trim() : text.trim()

    const parsed = JSON.parse(raw) as GeminiTrendResult
    parsed.timestamp = new Date().toISOString()

    return { success: true, data: parsed }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Gemini 오류: ${msg}` }
  }
}
