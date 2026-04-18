/**
 * AI 월 예산 타입 + 에러 (Phase 3-pre)
 *
 * 순수 타입·클래스만. Supabase 접근은 `lib/ai/generate.ts`(pre-call check) 또는
 * `lib/actions/ai-budget.ts`(CRUD)에서 수행.
 */

export interface BudgetStatus {
  /** 월 한도(USD). ai_budgets 에 행이 없으면 null */
  limitUsd:       number | null
  /** 경고 임계값(%) */
  warningPct:     number
  /** 이번 달 이미 누적된 비용(USD) */
  currentUsd:     number
  /** 이번 호출 예상 비용(USD) */
  estimateUsd:    number
  /** currentUsd + estimateUsd */
  projectedUsd:   number
  /** (projectedUsd / limitUsd) * 100 */
  utilizationPct: number
  /** utilization > warningPct */
  warn:           boolean
  /** utilization > 100 */
  exceed:         boolean
  /** true면 exceed 시 throw, false면 warn only */
  hardLimit:      boolean
}

export class BudgetExceededError extends Error {
  constructor(public status: BudgetStatus) {
    super(
      `AI 월 예산 초과: $${status.projectedUsd.toFixed(2)} / $${(status.limitUsd ?? 0).toFixed(2)} ` +
      `(${status.utilizationPct.toFixed(1)}%). hard_limit_enabled=true 로 설정되어 차단됨.`,
    )
    this.name = 'BudgetExceededError'
  }
}
