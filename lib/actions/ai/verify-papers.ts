'use server'

import { generateJson } from '@/lib/ai/generate'

// ── 타입 ──────────────────────────────────────────────────

export type PaperMatch = 'direct' | 'partial' | 'unrelated'

export interface PaperVerification {
  index:  number      // 입력 배열 인덱스와 동일 (전역 — 청크 오프셋 반영)
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

// ── 청킹 파라미터 (panel 표시에서도 참조) ─────────────────

/** 한 AI 호출당 처리하는 논문 수. */
const VERIFY_CHUNK_SIZE = 60
/** 한 라운드에서 검토할 최대 논문 수 (= CHUNK_SIZE × 병렬 청크 수). */
const VERIFY_MAX_PAPERS = 180

/** panel/UI 에서 한도 표시용 — 'use server' 파일이라 직접 const export 불가. */
export async function getVerifyChunkLimits(): Promise<{ chunkSize: number; maxPapers: number }> {
  return { chunkSize: VERIFY_CHUNK_SIZE, maxPapers: VERIFY_MAX_PAPERS }
}

// ── 액션 ──────────────────────────────────────────────────

/**
 * 검색된 논문 목록이 원래 연구 질문과 실제로 관련 있는지 Claude 가 검토.
 *
 * v21: 60편 단일 호출 → 60편 × 최대 3 청크 병렬 호출 (최대 180편)
 *   - rate-limit 시 청크 단위 fallback (실패 청크만 default verification)
 *   - 청크 내부 index 를 전역 index 로 재매핑 (청크 오프셋 더함)
 */
export async function verifyPaperRelevance(
  researchQuestion: string,
  researchIntent:   string,
  papers:           PaperForVerification[],
  projectId?:       string,
): Promise<PaperVerification[]> {
  if (papers.length === 0) return []

  const limited = papers.slice(0, VERIFY_MAX_PAPERS)

  // 청크 분할 (offset 보존)
  const chunks: { offset: number; items: PaperForVerification[] }[] = []
  for (let i = 0; i < limited.length; i += VERIFY_CHUNK_SIZE) {
    chunks.push({ offset: i, items: limited.slice(i, i + VERIFY_CHUNK_SIZE) })
  }

  // 병렬 호출 — Promise.all 로 동시 실행 (Anthropic API 동시 ≤3 안전)
  const chunkResults = await Promise.all(
    chunks.map(({ offset, items }) =>
      verifyChunk(researchQuestion, researchIntent, items, offset, projectId),
    ),
  )

  return chunkResults.flat()
}

async function verifyChunk(
  researchQuestion: string,
  researchIntent:   string,
  items:            PaperForVerification[],
  offset:           number,
  projectId?:       string,
): Promise<PaperVerification[]> {
  if (items.length === 0) return []

  // 청크 내부 인덱스(0~N-1) 로 prompt 작성. 결과 매핑 시 offset 더해 전역 index 로.
  const paperListStr = items
    .map(
      (p, i) =>
        `[${i}] "${p.title}"` +
        (p.year    ? ` (${p.year})` : '') +
        (p.journal ? ` — ${p.journal}` : '') +
        (p.abstract ? `\n    Abstract: ${p.abstract.slice(0, 400)}` : ''),
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
- direct   : 연구 질문의 핵심 주제·방법론과 명확히 관련된 논문. 핵심 키워드 및 연구 방향이 일치하거나 연구에 직접 활용 가능한 수준. (기준을 넓게 적용 — 관련성이 있다고 판단되면 direct 선호)
- partial  : 연구 질문과 간접적으로 관련 있거나 배경·맥락 참고용인 논문.
- unrelated: 키워드만 겹칠 뿐 실제 주제·맥락이 다름 (명백한 false positive만 해당).

⚠ 중요: 논문의 임팩트·인용 수는 판단 기준이 아닙니다. 오직 질문과의 주제 일치 여부만 봅니다.
JSON 배열만 반환, 마크다운 없이.
`.trim()

  try {
    const results = await generateJson<PaperVerification[]>(prompt, 0.2, {
      skipFrameworkProtocol: true,
      meta: { feature: 'paper_verification', projectId },
    })

    if (!Array.isArray(results)) {
      return items.map((_, i) => defaultVerification(i + offset))
    }

    // 청크 내부 index → 전역 index 재매핑 (offset 더함)
    const map = new Map(results.map((r) => [r.index, r]))
    return items.map((_, i) => {
      const local = map.get(i)
      return local
        ? { ...local, index: i + offset }
        : defaultVerification(i + offset)
    })
  } catch {
    // 청크 단위 fallback — 다른 청크들은 그대로 진행
    return items.map((_, i) => defaultVerification(i + offset))
  }
}

function defaultVerification(index: number): PaperVerification {
  return { index, match: 'partial', note: '자동 검토 불가' }
}
