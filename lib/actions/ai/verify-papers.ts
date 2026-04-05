'use server'

import { generateJson } from '@/lib/ai/generate'

// ── 타입 ──────────────────────────────────────────────────

export type PaperMatch = 'direct' | 'partial' | 'unrelated'

export interface PaperVerification {
  index:  number      // 입력 배열 인덱스와 동일
  match:  PaperMatch
  /**
   * direct   = 질문과 주제·방법이 직접 일치 — 핵심 참고 대상
   * partial  = 연관은 있지만 질문의 핵심 주제는 아님 — 보조 참고
   * unrelated = 키워드는 겹치지만 실제로는 다른 주제
   */
  note: string        // 판단 근거 (한 문장, 한국어)
}

export interface PaperForVerification {
  title:    string
  abstract: string | null
  year:     number | null
  journal:  string | null
}

// ── 액션 ──────────────────────────────────────────────────

/**
 * 검색된 논문 목록이 원래 연구 질문과 실제로 관련 있는지 Claude가 검토.
 * 키워드는 일치하지만 주제가 다른 논문(false positive)을 걸러냅니다.
 * 한 번의 AI 호출로 최대 20편을 일괄 처리합니다.
 */
export async function verifyPaperRelevance(
  researchQuestion: string,
  researchIntent:   string,
  papers:           PaperForVerification[],
  projectId?:       string,
): Promise<PaperVerification[]> {
  if (papers.length === 0) return []

  const batch = papers.slice(0, 20)

  const paperListStr = batch
    .map(
      (p, i) =>
        `[${i}] "${p.title}"` +
        (p.year    ? ` (${p.year})` : '') +
        (p.journal ? ` — ${p.journal}` : '') +
        (p.abstract ? `\n    Abstract 요약: ${p.abstract.slice(0, 200)}` : ''),
    )
    .join('\n\n')

  const prompt = `
당신은 학술 문헌 검토 전문가입니다.
아래 연구 질문에 대해 검색된 논문들이 실제로 관련 있는지 검토하세요.

[프로젝트 Research Intent]
${researchIntent}

[원래 연구 질문]
${researchQuestion}

[검색된 논문 목록]
${paperListStr}

각 논문에 대해 아래 JSON 배열로만 응답 (인덱스 순서 유지):
[
  {
    "index": 0,
    "match": "direct" | "partial" | "unrelated",
    "note": "판단 근거 한 문장 (한국어)"
  },
  ...
]

판정 기준:
- direct   : 연구 질문의 핵심 주제·방법론을 직접 다루는 논문. 이 연구를 쓰지 않으면 논거가 약해지는 수준.
- partial  : 연구 질문과 관련은 있지만 핵심 주제가 아님. 배경·보강 참고용.
- unrelated: 키워드만 겹칠 뿐 실제 주제·맥락이 다름 (false positive).

⚠ 중요: 논문의 임팩트·인용 수는 판단 기준이 아닙니다. 오직 질문과의 주제 일치 여부만 봅니다.
JSON 배열만 반환, 마크다운 없이.
`.trim()

  try {
    const results = await generateJson<PaperVerification[]>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'paper_verification', projectId },
    })

    // 배열 형태 보장
    if (!Array.isArray(results)) return batch.map((_, i) => defaultVerification(i))

    // 인덱스 기반으로 매핑 (순서가 바뀌더라도 안전하게)
    const map = new Map(results.map(r => [r.index, r]))
    return batch.map((_, i) => map.get(i) ?? defaultVerification(i))
  } catch {
    return batch.map((_, i) => defaultVerification(i))
  }
}

function defaultVerification(index: number): PaperVerification {
  return { index, match: 'partial', note: '자동 검토 불가' }
}
