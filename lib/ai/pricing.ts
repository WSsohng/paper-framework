/**
 * Claude 모델 가격 상수 + 토큰·비용 추정 헬퍼 (Phase 3-pre)
 *
 * 서버·클라이언트 공용. 'use server' 없음 (Supabase 접근 없음).
 *
 * 가격 정보는 Anthropic 공식 가격(2026-04 기준)을 그대로 복사.
 * 변동 시 이 파일만 업데이트하면 전체 비용 계산이 일치.
 */

/** USD per token — Anthropic 공식 표 기준 */
export const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  // Haiku 4.5 = $0.80 / $4.00 per 1M tokens
  'claude-haiku-4-5-20251001': { input: 0.0000008, output: 0.000004 },
  // 레거시 로그 호환 (과거 ai_usage_logs 행에 존재할 수 있음)
  'claude-3-5-haiku-latest':   { input: 0.0000008, output: 0.000004 },
}

/** 모델 매핑 없을 때의 보수적 fallback (Haiku 단가) */
const DEFAULT_RATE = { input: 0.0000008, output: 0.000004 }

/** 토큰 수 → USD */
export function calcCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = CLAUDE_PRICING[model] ?? DEFAULT_RATE
  return inputTokens * rate.input + outputTokens * rate.output
}

/**
 * 프롬프트 문자열 → 대략 입력 토큰 수.
 * 한국어·영어 혼재 기준 약 `chars / 3.5`.
 * 정확한 값은 Anthropic 응답의 `usage.input_tokens` 이며, 이 함수는 **pre-call 추정**용.
 */
export function estimatePromptTokens(prompt: string): number {
  return Math.ceil(prompt.length / 3.5)
}

/** 이번 호출의 최대 예상 비용(USD) — 입력 추정 + maxTokens 상한 기반 */
export function estimateCallCostUsd(
  prompt: string,
  maxTokens: number,
  model: string,
): number {
  const input = estimatePromptTokens(prompt)
  return calcCostUsd(model, input, maxTokens)
}
