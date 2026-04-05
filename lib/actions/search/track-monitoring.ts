'use server'

import { searchPapers } from '@/lib/actions/search/semantic-scholar'
import { generateJson } from '@/lib/ai/generate'
import type { RelevanceLevel } from '@/lib/types'

// ── 결과 타입 ─────────────────────────────────────────────

export interface TrackMonitorAlert {
  paper_title:      string
  journal:          string | null
  year:             number | null
  doi:              string | null
  open_access_url:  string | null
  relevance_level:  RelevanceLevel     // R1 / R2 / R3
  relevance_reason: string             // AI 판단 근거 (한두 문장)
  contradicts:      boolean            // 기존 연구를 반박할 가능성
  contradiction_note: string | null    // 반박 가능성이 있을 경우 설명
}

export interface TrackMonitoringResult {
  scanned_intent:   string
  new_papers_found: number
  alerts:           TrackMonitorAlert[]
  scan_time:        string
}

export type TrackMonitoringActionResult =
  | { success: true;  data: TrackMonitoringResult }
  | { success: false; error: string }

// ── 트랙 연관 최신 논문 모니터링 ─────────────────────────

/**
 * 트랙의 Research Intent 기반으로 최신 논문을 검색하고,
 * 기존 컬렉션에 없는 신규 논문을 AI로 연관도(R1/R2/R3) 평가.
 * R1 발견 시 또는 기존 연구 반박 가능성 시 알림.
 */
export async function monitorTrackPapers(
  trackResearchIntent: string,
  existingDois: Set<string>,
  projectId?: string,
): Promise<TrackMonitoringActionResult> {
  if (!trackResearchIntent.trim()) {
    return { success: false, error: '트랙 Research Intent가 비어 있습니다.' }
  }

  // Research Intent에서 핵심 검색 키워드 추출 (최대 3개 쿼리)
  const queries = extractSearchQueries(trackResearchIntent)

  const candidates: {
    title: string
    journal: string | null
    year: number | null
    doi: string | null
    open_access_url: string | null
    abstract: string | null
  }[] = []

  for (const query of queries.slice(0, 3)) {
    const result = await searchPapers(query, 10)
    if (!result.success) continue

    for (const paper of result.data) {
      if (paper.doi && existingDois.has(paper.doi)) continue
      const alreadyAdded = candidates.some(
        c => c.title.toLowerCase() === paper.title.toLowerCase(),
      )
      if (alreadyAdded) continue

      candidates.push({
        title:           paper.title,
        journal:         paper.journal,
        year:            paper.year,
        doi:             paper.doi,
        open_access_url: paper.open_access_url,
        abstract:        paper.abstract ?? null,
      })
    }
    await delay(300)
  }

  if (candidates.length === 0) {
    return {
      success: true,
      data: {
        scanned_intent:   trackResearchIntent,
        new_papers_found: 0,
        alerts:           [],
        scan_time:        new Date().toISOString(),
      },
    }
  }

  // AI: 연관도(R1/R2/R3) + 반박 가능성 평가
  const paperListStr = candidates
    .slice(0, 20)
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" (${p.year ?? '연도불명'}) — ${p.journal ?? '저널불명'}` +
        (p.abstract ? `\n   Abstract: ${p.abstract.slice(0, 200)}…` : ''),
    )
    .join('\n\n')

  const prompt = `
당신은 특정 연구 트랙을 관리하는 리서치 어시스턴트입니다.

[트랙 Research Intent]
${trackResearchIntent}

[신규 발견 논문 목록 (기존 컬렉션 미포함)]
${paperListStr}

각 논문에 대해 아래 JSON 배열로만 응답하세요 (순서 유지):
[
  {
    "relevance_level": 1, 2, 또는 3,
    "relevance_reason": "한두 문장으로 연관 이유",
    "contradicts": true 또는 false,
    "contradiction_note": "반박 가능성이 있는 경우 설명, 없으면 null"
  }
]

평가 기준 — 오직 "트랙과의 주제 연관성"만 봅니다:
- R1 (핵심 연관): 이 트랙이 직접 다루는 방법론·실험·주제와 정확히 일치
- R2 (부분 연관): 트랙의 방법론·개념을 공유하거나 보강 근거로 활용 가능
- R3 (배경 연관): 분야 배경·흐름, 서론 참조 수준
- contradicts: 이 논문이 트랙의 기존 가설이나 방법론을 반박하거나 대체할 수 있는가

⚠ R레벨은 논문의 임팩트·인용 수·저자 저명도와 무관합니다.
  오직 "트랙 Research Intent와 주제가 얼마나 맞닿아 있는가"만 평가하세요.

JSON 배열만 반환, 마크다운 없이.
`.trim()

  let assessments: {
    relevance_level: number
    relevance_reason: string
    contradicts: boolean
    contradiction_note: string | null
  }[] = []

  try {
    assessments = await generateJson(prompt, 0.3, {
      skipFrameworkProtocol: true,
      meta: { feature: 'track_monitoring', projectId },
    })
  } catch {
    assessments = candidates.map(() => ({
      relevance_level:   3,
      relevance_reason:  'AI 분석 불가',
      contradicts:       false,
      contradiction_note: null,
    }))
  }

  const alerts: TrackMonitorAlert[] = candidates
    .slice(0, 20)
    .map((p, i) => {
      const a = assessments[i]
      const level = ([1, 2, 3] as RelevanceLevel[]).includes(a?.relevance_level as RelevanceLevel)
        ? (a.relevance_level as RelevanceLevel)
        : 3
      return {
        paper_title:      p.title,
        journal:          p.journal,
        year:             p.year,
        doi:              p.doi,
        open_access_url:  p.open_access_url,
        relevance_level:  level,
        relevance_reason: a?.relevance_reason ?? '',
        contradicts:      a?.contradicts ?? false,
        contradiction_note: a?.contradiction_note ?? null,
      }
    })
    .filter(a => a.relevance_level <= 2 || a.contradicts) // R3 + 반박 없음 제외

  return {
    success: true,
    data: {
      scanned_intent:   trackResearchIntent,
      new_papers_found: candidates.length,
      alerts,
      scan_time:        new Date().toISOString(),
    },
  }
}

// ── 헬퍼: Research Intent → 검색 쿼리 ───────────────────

function extractSearchQueries(intent: string): string[] {
  // Intent에서 의미있는 구절 추출 (단순 슬라이싱 + 전체 쿼리)
  const sentences = intent.split(/[.。\n]/).map(s => s.trim()).filter(Boolean)
  const queries: string[] = []

  // 전체 Intent 요약을 첫 번째 쿼리로
  if (intent.length > 50) {
    queries.push(intent.slice(0, 120))
  } else {
    queries.push(intent)
  }

  // 두 번째 문장 (있을 경우)
  if (sentences[1] && sentences[1].length > 20) {
    queries.push(sentences[1])
  }

  return queries
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}
