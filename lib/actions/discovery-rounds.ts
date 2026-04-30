'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FoundPaper } from '@/lib/actions/search/semantic-scholar'
import type { PaperVerification } from '@/lib/actions/ai/verify-papers'
import type { SearchPlan } from '@/lib/types/search-plan'
import type {
  DiscoveryMode,
  ResearchQuestion,
  RegenerateHistoryEntry,
} from '@/lib/types/research-questions'

// ── Types ──────────────────────────────────────────────────

export interface DiscoveryRoundRow {
  id:                 string
  project_id:         string
  /** v20: 이 라운드가 귀결된 트랙. NULL = 진행 중 또는 레거시(미분류). */
  track_id:           string | null
  question:           string
  angle:              string
  user_insight:       string | null
  /** SearchPlan (신규) 또는 구 KeywordExtractResult 형식 (레거시 호환) */
  keywords:           SearchPlan | Record<string, unknown> | null
  papers:             FoundPaper[]
  verifications:      { index: number; match: PaperVerification['match']; note: string }[]
  saved_semantic_ids: string[]
  show_unrelated:     boolean
  /** v20: AI 가 생성한 5개 후보 질문 전체. NULL = 레거시. */
  question_candidates: ResearchQuestion[] | null
  /** v20: 사용자가 선택한 후속 질문 모드. 첫 라운드 또는 레거시는 NULL. */
  mode:                DiscoveryMode | null
  /** v20: Regenerate 회차별 후보 묶음. 마지막 회차가 question_candidates 와 동일. */
  regenerate_history:  RegenerateHistoryEntry[] | null
  created_at:         string
}

// ── Read ───────────────────────────────────────────────────

export async function getDiscoveryRounds(
  projectId: string,
): Promise<DiscoveryRoundRow[]> {
  const t0 = Date.now()
  const supabase = await createClient()
  const tSupa = Date.now() - t0

  const { data, error } = await supabase
    .from('discovery_rounds')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const tQuery = Date.now() - t0

  if (error) {
    console.error(
      `[getDiscoveryRounds] project=${projectId.slice(0, 8)} FAILED after ${tQuery}ms:`,
      error,
    )
    return []
  }

  const rows = (data ?? []) as DiscoveryRoundRow[]
  const bytes = JSON.stringify(rows).length
  console.log(
    `[getDiscoveryRounds] project=${projectId.slice(0, 8)} rows=${rows.length} ` +
    `payload=${(bytes / 1024).toFixed(1)}KB supaInit=${tSupa}ms total=${tQuery}ms`,
  )

  return rows
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
  // v20: 후속 질문 모드 + 후보 보존 (선택 — 첫 라운드는 mode/candidates 없이 저장 가능)
  question_candidates?: ResearchQuestion[] | null
  mode?:               DiscoveryMode | null
  regenerate_history?: RegenerateHistoryEntry[] | null
}

export async function saveDiscoveryRound(
  input: SaveDiscoveryRoundInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discovery_rounds')
    .insert({
      project_id:          input.project_id,
      question:            input.question,
      angle:               input.angle,
      user_insight:        input.user_insight,
      keywords:            input.keywords,
      papers:              input.papers,
      verifications:       input.verifications,
      // v20 — 후속 질문 모드/후보 보존 (NULL 허용)
      question_candidates: input.question_candidates ?? null,
      mode:                input.mode ?? null,
      regenerate_history:  input.regenerate_history ?? null,
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

// ── v20: 트랙 단위 조회 ────────────────────────────────────

/**
 * 트랙별 발굴 라운드 조회.
 *
 * - trackId 가 string: 그 트랙으로 마킹된 라운드만
 * - trackId 가 null:   미분류(track_id IS NULL) 라운드만 — "이전 기록 > 미분류" 그룹
 *
 * 두 경우 모두 created_at 오름차순.
 */
export async function getDiscoveryRoundsByTrack(
  projectId: string,
  trackId:   string | null,
): Promise<DiscoveryRoundRow[]> {
  const supabase = await createClient()
  const query = supabase
    .from('discovery_rounds')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const { data, error } = trackId
    ? await query.eq('track_id', trackId)
    : await query.is('track_id', null)

  if (error) {
    console.error('[getDiscoveryRoundsByTrack] failed:', error)
    return []
  }
  return (data ?? []) as DiscoveryRoundRow[]
}

// ── v20: 트랙 생성 시 라운드 일괄 마킹 ─────────────────────

/**
 * 트랙 생성 직후 호출. 해당 프로젝트의 track_id IS NULL 라운드를
 * 모두 새 트랙 ID 로 마킹한다.
 *
 * 의도: 라운드 데이터는 절대 삭제되지 않고 트랙별로 묶여 영구 보존.
 * 다음 트랙 시작 시 또 NULL 상태로 새 라운드가 누적되고, 그 트랙
 * 생성 시 또 일괄 마킹.
 */
export async function associateRoundsWithTrack(
  projectId: string,
  trackId:   string,
): Promise<{ success: boolean; updated?: number; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discovery_rounds')
    .update({ track_id: trackId })
    .eq('project_id', projectId)
    .is('track_id', null)
    .select('id')

  if (error) return { success: false, error: error.message }
  return { success: true, updated: data?.length ?? 0 }
}
