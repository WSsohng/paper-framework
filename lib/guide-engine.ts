/**
 * Guide Engine — 현재 진행 상황을 MODULE_USAGE_GUIDE에 매핑해
 * "지금 이 단계에서 무엇을 해야 하는가"를 계산한다.
 *
 * 이 파일의 로직 = 프레임워크 AI 가이드의 네비게이션 규칙.
 * 수정 시 모든 페이지의 가이드 메시지가 변경된다.
 */

import { MODULE_USAGE_GUIDE, type ModuleUsageGuide, type ModuleStep } from './framework-philosophy'

export interface Progress {
  refPaperCount:         number
  tier1Count:            number
  tier2Count:            number
  journalCount:          number
  shortlistedCount:      number
  assetCount:            number
  hypothesisCount:       number
  activeHypothesisCount: number
  draftCount:            number
  readyDraftCount:       number
  figureCount:           number
  finalFigureCount:      number
  reviewCount:           number
  resolvedReviewCount:   number
}

export interface GuideState {
  guide:      ModuleUsageGuide
  step:       ModuleStep
  stepIndex:  number
  /** 0-based index within MODULE_USAGE_GUIDE */
  moduleIndex: number
}

/**
 * progress + context → 현재 해야 할 가이드 스텝을 반환.
 * 순서: M0 → M1 → M2 → M3 → M4 → M5 → M6
 */
export function computeGuideState(
  progress: Progress,
  opts: { researchIntent?: string | null; trackCount?: number }
): GuideState {
  const { researchIntent, trackCount = 0 } = opts
  const g = MODULE_USAGE_GUIDE  // 7개 모듈

  // ── M0 문헌 탐색 ─────────────────────────────────────────
  if (!researchIntent || researchIntent.trim().length < 10) {
    return { guide: g[0], step: g[0].steps[0], stepIndex: 0, moduleIndex: 0 }
  }
  if (progress.refPaperCount < 3) {
    // 질문 선택 + 검색 단계
    return { guide: g[0], step: g[0].steps[2], stepIndex: 2, moduleIndex: 0 }
  }
  if (progress.tier1Count < 1) {
    // 티어 분류 필요
    return { guide: g[0], step: g[0].steps[4], stepIndex: 4, moduleIndex: 0 }
  }
  if (trackCount < 1) {
    // 주제 추천 → 트랙 생성
    return { guide: g[0], step: g[0].steps[6], stepIndex: 6, moduleIndex: 0 }
  }

  // ── M1 저널 ──────────────────────────────────────────────
  if (progress.journalCount === 0) {
    return { guide: g[1], step: g[1].steps[0], stepIndex: 0, moduleIndex: 1 }
  }
  if (progress.shortlistedCount < 2) {
    return { guide: g[1], step: g[1].steps[3], stepIndex: 3, moduleIndex: 1 }
  }

  // ── M2 자산 ──────────────────────────────────────────────
  if (progress.assetCount < 3) {
    return { guide: g[2], step: g[2].steps[0], stepIndex: 0, moduleIndex: 2 }
  }
  if (progress.assetCount < 5) {
    return { guide: g[2], step: g[2].steps[3], stepIndex: 3, moduleIndex: 2 }
  }

  // ── M3 논증 ──────────────────────────────────────────────
  if (progress.hypothesisCount === 0) {
    return { guide: g[3], step: g[3].steps[0], stepIndex: 0, moduleIndex: 3 }
  }
  if (progress.activeHypothesisCount === 0) {
    return { guide: g[3], step: g[3].steps[1], stepIndex: 1, moduleIndex: 3 }
  }

  // ── M4 초고 ──────────────────────────────────────────────
  if (progress.draftCount === 0) {
    return { guide: g[4], step: g[4].steps[0], stepIndex: 0, moduleIndex: 4 }
  }
  if (progress.readyDraftCount === 0) {
    return { guide: g[4], step: g[4].steps[2], stepIndex: 2, moduleIndex: 4 }
  }

  // ── M5 도표 ──────────────────────────────────────────────
  if (progress.figureCount < 2) {
    return { guide: g[5], step: g[5].steps[0], stepIndex: 0, moduleIndex: 5 }
  }
  if (progress.finalFigureCount < 2) {
    return { guide: g[5], step: g[5].steps[2], stepIndex: 2, moduleIndex: 5 }
  }

  // ── M6 검토·피드백 ───────────────────────────────────────
  if (progress.reviewCount === 0) {
    return { guide: g[6], step: g[6].steps[0], stepIndex: 0, moduleIndex: 6 }
  }
  if (progress.resolvedReviewCount < progress.reviewCount) {
    return { guide: g[6], step: g[6].steps[1], stepIndex: 1, moduleIndex: 6 }
  }

  // 최종 — 제출
  return { guide: g[6], step: g[6].steps[2], stepIndex: 2, moduleIndex: 6 }
}

/**
 * 특정 모듈의 가이드 스텝 진행 상황을 반환 (모듈 페이지용).
 */
export function getModuleGuide(tag: string): ModuleUsageGuide | undefined {
  return MODULE_USAGE_GUIDE.find((g) => g.tag === tag)
}
