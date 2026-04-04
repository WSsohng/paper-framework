'use server'

import { generateJson } from '@/lib/ai/generate'

export interface TimelinessAnalysis {
  field_cycle_months: number        // 이 분야의 논문 갱신 주기 (개월)
  urgency: 'critical' | 'high' | 'moderate' | 'low'
  urgency_reason: string            // 왜 이 긴급도인지 (Korean, 2 sentences)
  recommended_submit_date: string   // YYYY-MM 형식
  reasoning: string                 // 역산 근거 (Korean, 3-4 sentences)
  risk_factors: string[]            // 주의해야 할 리스크 (Korean, 최대 3개)
}

export type TimelinessResult =
  | { success: true;  data: TimelinessAnalysis }
  | { success: false; error: string }

export interface Tier1PaperSummary {
  title: string
  year:  number | null
  journal: string | null
}

export async function analyzeTimeliness(
  projectName: string,
  researchIntent: string,
  tier1Papers: Tier1PaperSummary[],
  experimentStartDate?: string | null,  // YYYY-MM-DD
): Promise<TimelinessResult> {
  const paperList = tier1Papers
    .slice(0, 20)
    .map((p, i) =>
      `${i + 1}. ${p.title}${p.year ? ` (${p.year})` : ''}${p.journal ? ` — ${p.journal}` : ''}`,
    )
    .join('\n')

  const experimentSection = experimentStartDate
    ? `Researcher's planned experiment start date: ${experimentStartDate}`
    : `Experiment start date: not yet set`

  const prompt = `You are an academic publishing strategist analyzing research timeliness.

Project: ${projectName}
Research Intent: ${researchIntent}
${experimentSection}

Tier-1 competing papers (most directly relevant to this research):
${paperList.length > 0 ? paperList : '(none yet — early stage)'}

Analyze the publication dynamics of this research field and estimate an optimal submission timeline.

Consider:
- How fast does this field move? (AI fields: 2-4 months; chemistry: 6-18 months; etc.)
- Based on tier-1 paper dates, is this field accelerating or stable?
- If experiment start date is given, estimate: experiment duration (typical for this field) + writing (~1-2 months) + review (~2-3 months) = target submit date
- If no experiment date, estimate from today
- Urgency: if tier-1 papers are very recent and close to this topic → critical

Return ONLY a valid JSON object:
{
  "field_cycle_months": 6,
  "urgency": "high",
  "urgency_reason": "Korean: 왜 이 긴급도인지 2문장",
  "recommended_submit_date": "2025-09",
  "reasoning": "Korean: 역산 근거 3-4문장 (실험기간 + 작성기간 + 리뷰기간)",
  "risk_factors": ["Korean risk 1", "Korean risk 2"]
}

No markdown — pure JSON only.`

  try {
    const data = await generateJson<TimelinessAnalysis>(prompt, 0.3, { meta: { feature: 'timeliness_analysis' } })
    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
