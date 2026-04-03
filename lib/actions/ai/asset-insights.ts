'use server'

import { generateJson } from '@/lib/ai/generate'
import type { AssetSection } from '@/lib/types'

export interface AssetInsight {
  title:              string          // 자산 제목 (한국어 or 영어 그대로)
  content:            string          // 인용구 or 요약 텍스트
  type:               'quote' | 'note'
  paper_section:      AssetSection    // 이 자산을 쓸 논문 섹션
  reason:             string          // 왜 이 섹션에 쓰면 좋은지 (Korean, 1 sentence)
}

export interface InsightPaper {
  id:       string
  title:    string
  abstract: string | null
  notes:    string | null
  tier:     number | null
}

export type AssetInsightResult =
  | { success: true;  data: AssetInsight[]; paperId: string }
  | { success: false; error: string }

/**
 * 참고문헌 1편의 abstract/notes를 분석해서
 * 논문에 직접 활용 가능한 인사이트/인용구를 추출합니다.
 */
export async function extractAssetInsights(
  paper: InsightPaper,
  researchIntent: string,
  existingTitles: string[],
): Promise<AssetInsightResult> {
  const text = [
    paper.abstract ? `ABSTRACT:\n${paper.abstract}` : '',
    paper.notes    ? `RESEARCHER NOTES:\n${paper.notes}`  : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  if (!text.trim()) {
    return { success: false, error: '이 논문에 Abstract 또는 메모가 없습니다.' }
  }

  const tierLabel =
    paper.tier === 1 ? 'Tier-1 (competitive — directly rivals our work)' :
    paper.tier === 2 ? 'Tier-2 (core reference — key reasoning support)'  :
    paper.tier === 3 ? 'Tier-3 (background — macro-level context)'        :
                       'unclassified'

  const existingStr = existingTitles.length > 0
    ? `\nAlready extracted (skip duplicates):\n${existingTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : ''

  const prompt = `You are a research writing assistant extracting reusable insights from a paper.

Research Intent: ${researchIntent}
Paper: ${paper.title} [${tierLabel}]

---
${text}
---
${existingStr}

Extract 3–5 specific, citable insights or quotes from this paper that the researcher can directly use when writing their paper. Focus on:
- For Tier-1: unique claims, methodology, results that the researcher must address or differentiate from
- For Tier-2: key findings, frameworks, or data that support the researcher's argument  
- For Tier-3: broader context, trends, or framing statements for introduction/conclusion

For each insight, assign the most appropriate paper section:
- intro: framing, background, motivation, why this topic matters
- methods: technical approach, methodology, experimental setup
- results: data, findings, numbers, comparisons
- discussion: interpretation, implications, limitations, future work
- conclusion: summary of contribution, significance

Return ONLY a valid JSON array of 3–5 objects:
[
  {
    "title": "concise label for this insight (Korean or original language is fine)",
    "content": "the exact quote or concise extracted insight (1–3 sentences)",
    "type": "quote or note",
    "paper_section": "intro | methods | results | discussion | conclusion | supplementary",
    "reason": "Korean: 1 sentence — why this fits that section"
  }
]

No markdown — pure JSON only.`

  try {
    const data = await generateJson<AssetInsight[]>(prompt, 0.3)
    return { success: true, data, paperId: paper.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
