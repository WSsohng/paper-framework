/**
 * Novelty 검증 결과 타입.
 *
 * 트랙 생성 직전 사용자가 명시적으로 "🔍 Novelty 검증" 버튼을 눌렀을 때
 * 생성됨. 5개 차원에서 차별점/겹침을 정리하고, 외부 검색(Semantic Scholar)
 * 으로 발견된 유사 논문을 함께 제시한다.
 *
 * 결정은 사용자가 함 — 시스템은 증거만 제공.
 */

/** 검증 5차원. */
export type NoveltyDimension =
  | 'topic'         // 주제 자체의 새로움
  | 'methodology'   // 방법론의 새로움
  | 'intersection'  // 분야 조합의 새로움
  | 'perspective'   // 관점/렌즈의 새로움
  | 'extension'     // 기존 연구의 확장 (도메인·조건 등)

export const DIMENSION_LABEL: Record<NoveltyDimension, string> = {
  topic:        '주제',
  methodology:  '방법론',
  intersection: '분야 조합',
  perspective:  '관점',
  extension:    '확장',
}

/** 한 차원의 분석 결과. */
export interface DimensionAnalysis {
  /** 'novel' = 차별점 뚜렷, 'partial' = 겹침 일부 있음, 'overlap' = 기존 연구와 강하게 겹침 */
  verdict: 'novel' | 'partial' | 'overlap'
  /** 차별점 또는 겹침의 서술 (Korean, 1-2 sentences) */
  rationale: string
  /** 위험 신호가 있다면 (Korean, optional) */
  risk?: string
}

/** Semantic Scholar 검색으로 발견된 유사 논문. */
export interface SimilarPaper {
  title:         string
  authors:       string[]
  year:          number | null
  journal:       string | null
  /** Semantic Scholar paper ID (있으면) */
  paper_id?:     string
  /** 어떤 차원에서 유사한가 */
  dimension:     NoveltyDimension
  /** 왜 유사한가 (Korean, 1 sentence) */
  similarity_note: string
}

/** 트랙에 영구 저장되는 검증 결과 전체. */
export interface NoveltyCheckResult {
  /** 검증 대상 주제 스냅샷 (검증 당시의 title/gap/angle) */
  target: {
    title: string
    gap:   string
    angle: string
  }
  /** 5차원 분석 (모든 차원 포함) */
  dimensions: Record<NoveltyDimension, DimensionAnalysis>
  /** 외부 검색으로 발견된 유사 논문 Top N (보통 5) */
  similar_papers: SimilarPaper[]
  /** 종합 요약 (Korean, 2-3 sentences) — UI 상단에 강조 표시 */
  summary: string
  /** 검증 시각 (ISO) */
  checked_at: string
}

/**
 * 회귀 시그널 — 사용자가 검증 결과 보고 "질문 단계로 회귀" 선택 시
 * 다음 라운드의 buildFollowUpTask 컨텍스트로 주입됨.
 *
 * 검증 결과 전체를 그대로 던지면 프롬프트가 비대해지므로, 핵심만 압축한다.
 */
export interface NoveltySignal {
  /** 직전에 검증 시도한 주제 */
  attempted_title: string
  /** 가장 약한(겹친) 차원들 */
  weak_dimensions: NoveltyDimension[]
  /** 회피해야 할 영역 또는 차별화 방향 (Korean, 2-3 sentences) */
  guidance: string
  /** 시그널 생성 시각 */
  created_at: string
}
