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
