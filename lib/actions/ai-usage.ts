'use server'

import { createClient } from '@/lib/supabase/server'
import { getAIStatus } from '@/lib/ai/generate'
import { calcCostUsd } from '@/lib/ai/pricing'
import { FEATURE_LABELS } from '@/lib/ai-feature-labels'

// 비용 단가는 lib/ai/pricing.ts 에 중앙화 (Phase 3-pre).

// ── 타입 ─────────────────────────────────────────────────

export interface UsageSummary {
  totalInput:    number
  totalOutput:   number
  totalTokens:   number
  estimatedCost: number   // USD
  callCount:     number
}

export interface FeatureUsage {
  feature:       string
  label:         string
  input_tokens:  number
  output_tokens: number
  call_count:    number
  cost:          number
}

export interface RecentLog {
  id:            string
  feature:       string
  label:         string
  provider:      string
  model:         string
  input_tokens:  number
  output_tokens: number
  cost:          number
  created_at:    string
}

export interface AIUsageData {
  aiStatus:        { provider: string; model: string | null }
  allTime:         UsageSummary
  thisMonth:       UsageSummary
  byFeature:       FeatureUsage[]
  recentLogs:      RecentLog[]
  hasLogs:         boolean
}

// ── 메인 조회 액션 ────────────────────────────────────────

export async function getAIUsageData(projectId?: string | null): Promise<AIUsageData> {
  const [supabase, aiStatus] = await Promise.all([
    createClient(),
    getAIStatus(),
  ])

  // 전체 기간 쿼리
  let allQuery = supabase
    .from('ai_usage_logs')
    .select('feature, model, input_tokens, output_tokens, created_at')
  if (projectId) allQuery = allQuery.eq('project_id', projectId)

  // 이번 달 시작일
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // 최근 30개 로그
  let recentQuery = supabase
    .from('ai_usage_logs')
    .select('id, feature, provider, model, input_tokens, output_tokens, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (projectId) recentQuery = recentQuery.eq('project_id', projectId)

  const [allResult, recentResult] = await Promise.all([allQuery, recentQuery])

  const allLogs = allResult.data ?? []
  const recent  = recentResult.data ?? []

  // 전체 합계
  const allTime = summarize(allLogs)

  // 이번 달 합계
  const monthLogs = allLogs.filter(
    (l) => new Date(l.created_at) >= monthStart,
  )
  const thisMonth = summarize(monthLogs)

  // 기능별 집계
  const featureMap: Record<string, { input: number; output: number; count: number; model: string }> = {}
  for (const log of allLogs) {
    const f = log.feature ?? 'other'
    if (!featureMap[f]) featureMap[f] = { input: 0, output: 0, count: 0, model: log.model }
    featureMap[f].input  += log.input_tokens
    featureMap[f].output += log.output_tokens
    featureMap[f].count  += 1
  }

  const byFeature: FeatureUsage[] = Object.entries(featureMap)
    .map(([feature, v]) => ({
      feature,
      label:         FEATURE_LABELS[feature] ?? feature,
      input_tokens:  v.input,
      output_tokens: v.output,
      call_count:    v.count,
      cost:          calcCostUsd(v.model, v.input, v.output),
    }))
    .sort((a, b) => b.input_tokens + b.output_tokens - a.input_tokens - a.output_tokens)

  // 최근 로그
  const recentLogs: RecentLog[] = recent.map((l) => ({
    id:            l.id,
    feature:       l.feature,
    label:         FEATURE_LABELS[l.feature] ?? l.feature,
    provider:      l.provider,
    model:         l.model,
    input_tokens:  l.input_tokens,
    output_tokens: l.output_tokens,
    cost:          calcCostUsd(l.model, l.input_tokens, l.output_tokens),
    created_at:    l.created_at,
  }))

  return {
    aiStatus: { provider: aiStatus.provider, model: aiStatus.model },
    allTime,
    thisMonth,
    byFeature,
    recentLogs,
    hasLogs: allLogs.length > 0,
  }
}

function summarize(
  logs: { model: string; input_tokens: number; output_tokens: number }[],
): UsageSummary {
  let totalInput = 0, totalOutput = 0, cost = 0
  for (const l of logs) {
    totalInput  += l.input_tokens
    totalOutput += l.output_tokens
    cost        += calcCostUsd(l.model, l.input_tokens, l.output_tokens)
  }
  return {
    totalInput,
    totalOutput,
    totalTokens:   totalInput + totalOutput,
    estimatedCost: cost,
    callCount:     logs.length,
  }
}
