'use server'

/**
 * AI 월 예산 CRUD + 상태 조회 (Phase 3-pre)
 *
 * UI는 Phase 3-full 에서 제공. 이 파일은 아래에서 사용됨:
 *   - 수동 설정 (예: REPL / 스크립트 / SQL 대체)
 *   - 대시보드에서 현재 사용률 표시 (선택)
 *   - Phase 3-full 의 예산 설정 패널
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcCostUsd } from '@/lib/ai/pricing'
import type { ActionResult, AiBudget, AiBudgetInput } from '@/lib/types'

// ── 조회 ──────────────────────────────────────────────────

export async function getAiBudget(projectId: string): Promise<AiBudget | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_budgets')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as AiBudget | null
}

// ── 업서트 ────────────────────────────────────────────────

export async function upsertAiBudget(
  input: AiBudgetInput,
): Promise<ActionResult<AiBudget>> {
  if (input.monthly_limit_usd <= 0) {
    return { success: false, error: 'monthly_limit_usd 는 0보다 커야 합니다.' }
  }
  if (
    input.warning_threshold_pct != null &&
    (input.warning_threshold_pct < 0 || input.warning_threshold_pct > 100)
  ) {
    return { success: false, error: 'warning_threshold_pct 는 0~100 이어야 합니다.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_budgets')
    .upsert(
      {
        project_id:            input.project_id,
        monthly_limit_usd:     input.monthly_limit_usd,
        warning_threshold_pct: input.warning_threshold_pct ?? 80,
        hard_limit_enabled:    input.hard_limit_enabled    ?? false,
      },
      { onConflict: 'project_id' },
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/ai-usage')
  revalidatePath(`/projects/${input.project_id}`)
  return { success: true, data: data as AiBudget }
}

// ── 삭제 ──────────────────────────────────────────────────

export async function deleteAiBudget(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_budgets')
    .delete()
    .eq('project_id', projectId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/ai-usage')
  revalidatePath(`/projects/${projectId}`)
  return { success: true, data: undefined }
}

// ── 현재 사용 상태 (UI 표시용) ───────────────────────────

export interface AiBudgetStatusView {
  budget:         AiBudget | null
  currentUsd:     number
  utilizationPct: number | null
}

/** 이번 달 누적 + 예산 대비 사용률 (UI / 대시보드 용) */
export async function getAiBudgetStatus(
  projectId: string,
): Promise<AiBudgetStatusView> {
  const supabase = await createClient()

  const [budgetRes, logsRes] = await Promise.all([
    supabase
      .from('ai_budgets')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle(),
    (async () => {
      const monthStart = new Date()
      monthStart.setUTCDate(1)
      monthStart.setUTCHours(0, 0, 0, 0)
      return supabase
        .from('ai_usage_logs')
        .select('model, input_tokens, output_tokens')
        .eq('project_id', projectId)
        .gte('created_at', monthStart.toISOString())
    })(),
  ])

  const budget = (budgetRes.data ?? null) as AiBudget | null
  const logs   = logsRes.data ?? []

  const currentUsd = logs.reduce(
    (sum, l) => sum + calcCostUsd(l.model, l.input_tokens, l.output_tokens),
    0,
  )

  const utilizationPct =
    budget && budget.monthly_limit_usd > 0
      ? (currentUsd / Number(budget.monthly_limit_usd)) * 100
      : null

  return { budget, currentUsd, utilizationPct }
}
