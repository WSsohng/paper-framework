/**
 * Academic Factory — governing philosophy (single source of truth).
 * Used by: /insights, dashboard, and AI prompts (token-conscious).
 */

export const FRAMEWORK_MASTER_INSIGHT = {
  title:
    '연구자의 직관이 주도하고, AI가 프로토콜을 가속한다',

  body:
    '첫 아이디어에서 출발해 단계마다 사람의 통찰이 방향을 정한다. AI는 중간 실행(옵션·초안·검색·정리)을 빠르게 안내하고, 연구자는 처음부터 끝까지 모든 것을 손으로 하지 않고 선택·조정·인사이트로 관여한다.',

  /** 80 / 20 — 짧게 */
  split:
    '절차·반복 작업은 AI가 대부분 담당하고, 방향·통찰·최종 판단은 사람이 맡는다.',

  splitRatio: '자동화·가속 구간 ≈ 80% · 선택·수정·통찰 ≈ 20%',

  principleEn:
    'Human intuition leads · AI accelerates the protocol · You choose, steer, and add insight',

  /** UI용 짧은 단계 (루프) */
  protocolSteps: [
    'Intent·아이디어',
    'AI 옵션',
    '선택·인사이트',
    '가속 실행',
    '다음 단계',
  ] as const,
} as const

/**
 * Prepended to reasoning prompts. English keeps tokens low; models follow well.
 */
export const AI_PROTOCOL_PREAMBLE = `
[System protocol — Academic Factory]
- Lead: The researcher's intent and intuition are primary. You accelerate execution; you do not replace judgment or originality.
- Output: Clear, concise, ranked options aligned with the user's stated intent. The user selects, edits, and adds insight at every step.
- Work split: Aim for ~80% procedural acceleration (options, drafts, search scaffolding); ~20% remains human steering, correction, and insight — reflect that in tone (support, don't overclaim).
- Never contradict the user's research intent; if ambiguous, surface 2–3 clarifying angles as choices, not as final truth.
`.trim()

export function withFrameworkProtocol(userPrompt: string): string {
  return `${AI_PROTOCOL_PREAMBLE}\n\n---\n\n${userPrompt}`
}

// ── 모듈별 가이드 기준 (Guide Basis) ─────────────────────
// 각 모듈 AI 호출 시 어떤 컨텍스트를 사용하는지 명시.
// - /insights 페이지에서 표시 → 개발자가 보고 프롬프트 수정 포인트로 활용.
// - 실제 프롬프트에서 이 항목들을 참조해야 AI 가이드 품질이 일관됨.

export interface ModuleGuideBasis {
  module:   string
  tag:      string
  inputs:   string[]   // AI가 참조하는 정보 목록
  goal:     string     // 이 모듈 가이드의 목적 (Korean)
}

export const MODULE_GUIDE_BASIS: ModuleGuideBasis[] = [
  {
    module:  '문헌 탐색 & 주제 설정',
    tag:     'M0',
    inputs:  [
      'Research Intent (프로젝트 핵심 아이디어)',
      '1티어 논문 목록 & 발행 주기 (시의성)',
      '2·3티어 논문 pool',
      '연구자의 인사이트 주석 (각 라운드)',
    ],
    goal:    '최신 동향 기반 전략적 연구 질문 제시 → 논문 pool 누적 → 투고 가능한 주제 도출',
  },
  {
    module:  '저널 인텔리전스',
    tag:     'M1',
    inputs:  [
      'Research Intent',
      '1티어 논문들의 주요 게재 저널',
      '트랙의 현재 단계 (Track Stage)',
      '목표 Impact Factor 범위 (사용자 설정 시)',
    ],
    goal:    '연구 범위·수준과 저널 Fit 평가 (적절/부족/과잉) → 전략적 저널 선택 지원',
  },
  {
    module:  '자산 라이브러리',
    tag:     'M2',
    inputs:  [
      '참고문헌 (2·3티어 인용 위주)',
      '트랙 Research Intent',
    ],
    goal:    '핵심 인용문·데이터·도표를 프로젝트 공유 자산으로 구조화',
  },
  {
    module:  '논증 설계',
    tag:     'M3',
    inputs:  [
      '1티어 논문 (선행 연구와 차별점 확인)',
      '2티어 논문 (추론 근거)',
      'Research Intent & 목표 저널 scope',
      '트랙 컨텍스트 로그 (이전 결정 사항)',
    ],
    goal:    'AI 가설 수립 → 코어 실험 설계 → 실험값 검증 · 재설계 피드백',
  },
  {
    module:  '초고 공장',
    tag:     'M4',
    inputs:  [
      'confirmed 가설 & 실험값 요약',
      '목표 저널 scope & 작성 가이드라인',
      '1·2티어 논문 (서론 레퍼런스)',
      '트랙 컨텍스트 로그',
    ],
    goal:    '논문 구조(서론/실험방법/결과/토론/결론) 자동 초안 → 저널 포맷 정렬',
  },
  {
    module:  '도표 & 데이터',
    tag:     'M5',
    inputs:  [
      '가설 & 실험값',
      '초고 섹션 구조',
      '목표 저널의 도표 가이드라인',
    ],
    goal:    '실험값 → Figure·Table 계획 및 캡션 자동 생성 → 초고와 연결',
  },
  {
    module:  '레드팀 & 제출',
    tag:     'M6',
    inputs:  [
      '목표 저널 리뷰어 프로필 (저널 scope 기반 추정)',
      '완성된 초고',
      'confirmed 가설 & Figure 목록',
      '1티어 논문 (신규성 비교 기준)',
    ],
    goal:    '다양한 리뷰어 페르소나로 적대적 피드백 생성 → 취약점 보강 → 제출 준비',
  },
]
