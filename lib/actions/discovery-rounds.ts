'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FoundPaper } from '@/lib/actions/search/search-papers'
import type { PaperVerification } from '@/lib/actions/ai/verify-papers'
import type { SearchPlan } from '@/lib/actions/ai/plan-search'

// ── Types ──────────────────────────────────────────────────

export interface DiscoveryRoundRow {
  id:                 string
  project_id:         string
  question:           string
  angle:              string
  user_insight:       string | null
  /** SearchPlan (신규) 또는 구 KeywordExtractResult 형식 (레거시 호환) */
  keywords:           SearchPlan | Record<string, unknown> | null
  papers:             FoundPaper[]
  verifications:      { index: number; match: PaperVerification['match']; note: string }[]
  saved_semantic_ids: string[]
  show_unrelated:     boolean
  created_at:         string
}

// ── Read ───────────────────────────────────────────────────

export async function getDiscoveryRounds(
  projectId: string,
): Promise<DiscoveryRoundRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discovery_rounds')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) { console.error('getDiscoveryRounds:', error); return [] }
  return (data ?? []) as DiscoveryRoundRow[]
}

// ── Create ─────────────────────────────────────────────────

export interface SaveDiscoveryRoundInput {
  project_id:    string
  question:      string
  angle:         string
  user_insight:  string | null
  keywords:      SearchPlan | Record<string, unknown> | null
  papers:        FoundPaper[]
  verifications: { index: number; match: PaperVerification['match']; note: string }[]
}

export async function saveDiscoveryRound(
  input: SaveDiscoveryRoundInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discovery_rounds')
    .insert({
      project_id:    input.project_id,
      question:      input.question,
      angle:         input.angle,
      user_insight:  input.user_insight,
      keywords:      input.keywords,
      papers:        input.papers,
      verifications: input.verifications,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}

// ── Update: saved paper IDs ────────────────────────────────

export async function updateRoundSavedIds(
  roundId:    string,
  semanticIds: string[],
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('discovery_rounds')
    .update({ saved_semantic_ids: semanticIds })
    .eq('id', roundId)
}

// ── Update: user insight ───────────────────────────────────

export async function updateRoundInsight(
  roundId:    string,
  insight:    string | null,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('discovery_rounds')
    .update({ user_insight: insight })
    .eq('id', roundId)
}

// ── Update: show_unrelated 토글 ───────────────────────────

export async function updateRoundShowUnrelated(
  roundId: string,
  show:    boolean,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('discovery_rounds')
    .update({ show_unrelated: show })
    .eq('id', roundId)
}

// ── Delete: single round ───────────────────────────────────

export async function deleteDiscoveryRound(roundId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('discovery_rounds').delete().eq('id', roundId)
}

// ── Delete: all rounds for a project (세션 초기화) ─────────

export async function clearDiscoveryRounds(projectId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('discovery_rounds').delete().eq('project_id', projectId)
  revalidatePath('/reference-papers')
}
