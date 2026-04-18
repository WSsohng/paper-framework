'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  ActionResult,
  TrackRelevance,
  TrackRelevanceInput,
  RelevanceLevel,
} from '@/lib/types'

/** 특정 트랙에 태깅된 모든 논문-연관도 레코드 조회 */
export async function getTrackRelevances(
  projectId: string,
  trackId: string,
): Promise<TrackRelevance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_paper_tracks')
    .select('*')
    .eq('track_id', trackId)

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 논문-트랙 연관도 upsert (AI 또는 사용자) */
export async function upsertTrackRelevance(
  input: TrackRelevanceInput,
): Promise<ActionResult<TrackRelevance>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_paper_tracks')
    .upsert(
      {
        reference_paper_id: input.reference_paper_id,
        track_id:           input.track_id,
        relevance_level:    input.relevance_level,
        relevance_reason:   input.relevance_reason ?? null,
        tagged_by:          input.tagged_by ?? 'ai',
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'reference_paper_id,track_id' },
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  return { success: true, data }
}

/** 사용자가 수동으로 R레벨을 변경 */
export async function updateRelevanceLevel(
  paperId: string,
  trackId: string,
  level: RelevanceLevel,
): Promise<ActionResult<TrackRelevance>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_paper_tracks')
    .update({ relevance_level: level, tagged_by: 'user', updated_at: new Date().toISOString() })
    .eq('reference_paper_id', paperId)
    .eq('track_id', trackId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  return { success: true, data }
}

/** 논문-트랙 연관도 태그 삭제 */
export async function deleteTrackRelevance(
  paperId: string,
  trackId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reference_paper_tracks')
    .delete()
    .eq('reference_paper_id', paperId)
    .eq('track_id', trackId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  return { success: true, data: undefined }
}

/** 트랙에 아직 태깅되지 않은 논문 ID 목록 조회 */
export async function getUntaggedPaperIds(
  projectId: string,
  trackId: string,
): Promise<string[]> {
  const supabase = await createClient()

  // 이미 태깅된 논문 ID
  const { data: tagged } = await supabase
    .from('reference_paper_tracks')
    .select('reference_paper_id')
    .eq('track_id', trackId)

  const taggedIds = (tagged ?? []).map(r => r.reference_paper_id)

  // 프로젝트 전체 논문
  const { data: allPapers } = await supabase
    .from('reference_papers')
    .select('id')
    .eq('project_id', projectId)

  const allIds = (allPapers ?? []).map(p => p.id)
  return allIds.filter(id => !taggedIds.includes(id))
}
