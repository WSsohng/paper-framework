'use server'

import { searchPapers } from '@/lib/actions/search/semantic-scholar'
import { generateJson } from '@/lib/ai/generate'

export interface MonitoringAlert {
  paper_title:  string
  journal:      string | null
  year:         number | null
  doi:          string | null
  open_access_url: string | null
  impact:       'critical' | 'significant' | 'minor'
  impact_reason: string   // Korean, 1-2 sentences
}

export interface MonitoringResult {
  scanned_keywords: string[]
  new_papers_found: number
  alerts:           MonitoringAlert[]
  scan_time:        string
}

export type TierMonitoringResult =
  | { success: true;  data: MonitoringResult }
  | { success: false; error: string }

export interface Tier1PaperForMonitoring {
  title:   string
  doi:     string | null
}

/**
 * 1티어 논문 키워드로 최신 논문 스캔.
 * 기존 DOI set과 비교해 신규 논문만 필터링 후 AI로 영향도 평가.
 */
export async function monitorTier1Papers(
  researchIntent: string,
  tier1Papers: Tier1PaperForMonitoring[],
  existingDois: Set<string>,
  searchKeywords: string[],   // 사용자가 지정한 모니터링 키워드
): Promise<TierMonitoringResult> {

  if (searchKeywords.length === 0 && tier1Papers.length === 0) {
    return {
      success: true,
      data: {
        scanned_keywords: [],
        new_papers_found: 0,
        alerts:  [],
        scan_time: new Date().toISOString(),
      },
    }
  }

  // 키워드가 없으면 1티어 제목에서 핵심 구절 추출
  const keywords = searchKeywords.length > 0
    ? searchKeywords
    : tier1Papers.slice(0, 3).map((p) => p.title.split(' ').slice(0, 5).join(' '))

  // 병렬 검색
  const allNew: { title: string; doi: string | null; journal: string | null; year: number | null; open_access_url: string | null }[] = []

  for (const kw of keywords.slice(0, 3)) {
    const result = await searchPapers(kw, 8)
    if (!result.success) continue

    for (const paper of result.data) {
      const doi = paper.doi
      if (doi && existingDois.has(doi)) continue
      // Skip exact title matches to tier-1 (already known)
      const alreadyKnown = tier1Papers.some((t) =>
        t.title.toLowerCase() === paper.title.toLowerCase(),
      )
      if (alreadyKnown) continue

      allNew.push({
        title:           paper.title,
        doi:             paper.doi,
        journal:         paper.journal,
        year:            paper.year,
        open_access_url: paper.open_access_url,
      })
    }
    await delay(300)
  }

  if (allNew.length === 0) {
    return {
      success: true,
      data: {
        scanned_keywords: keywords,
        new_papers_found: 0,
        alerts:  [],
        scan_time: new Date().toISOString(),
      },
    }
  }

  // AI로 영향도 평가
  const paperListStr = allNew
    .slice(0, 20)
    .map((p, i) => `${i + 1}. ${p.title}${p.year ? ` (${p.year})` : ''}`)
    .join('\n')

  const prompt = `You are a research advisor monitoring competing publications.

Research Intent: ${researchIntent}

Newly discovered papers (found via keyword scan, not yet in researcher's library):
${paperListStr}

For each paper, assess how much it might affect the researcher's work:
- critical = this paper might invalidate or duplicate our research, urgent action needed
- significant = overlapping topic, but our angle is distinct — worth reviewing soon
- minor = related field but not directly competing

Only flag papers as "critical" or "significant" if there is real overlap with the research intent.

Return ONLY a valid JSON array (one entry per paper in order):
[
  {
    "impact": "critical | significant | minor",
    "impact_reason": "Korean: 1-2 sentences explaining the impact"
  }
]

No markdown — pure JSON only.`

  let impacts: { impact: 'critical' | 'significant' | 'minor'; impact_reason: string }[] = []

  try {
    impacts = await generateJson(prompt, 0.3, { skipFrameworkProtocol: true })
  } catch {
    // If AI fails, mark all as minor
    impacts = allNew.map(() => ({ impact: 'minor' as const, impact_reason: '영향도 분석 불가' }))
  }

  const alerts: MonitoringAlert[] = allNew
    .slice(0, 20)
    .map((p, i) => ({
      paper_title:     p.title,
      journal:         p.journal,
      year:            p.year,
      doi:             p.doi,
      open_access_url: p.open_access_url,
      impact:          impacts[i]?.impact       ?? 'minor',
      impact_reason:   impacts[i]?.impact_reason ?? '',
    }))
    .filter((a) => a.impact !== 'minor')  // 'minor' 는 알람 불필요

  return {
    success: true,
    data: {
      scanned_keywords: keywords,
      new_papers_found: allNew.length,
      alerts,
      scan_time: new Date().toISOString(),
    },
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
