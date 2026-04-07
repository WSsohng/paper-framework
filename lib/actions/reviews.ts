'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Review, ReviewInput } from '@/lib/types'

export async function getReviews(
  opts: { draftId?: string; trackId?: string; projectId?: string } = {},
): Promise<Review[]> {
  // 모든 식별자가 없으면 전체 반환 방지
  if (!opts.draftId && !opts.trackId && !opts.projectId) return []
  const supabase = await createClient()

  let trackIds: string[] | null = null
  if (opts.projectId) {
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id')
      .eq('project_id', opts.projectId)
    trackIds = (tracks ?? []).map((t: { id: string }) => t.id)
    if (trackIds.length === 0) return []
  }

  let query = supabase
    .from('reviews')
    .select('*, draft:drafts(id,title), track:tracks(id,name,color)')
    .order('created_at', { ascending: false })

  if (opts.draftId)  query = query.eq('draft_id', opts.draftId)
  if (opts.trackId)  query = query.eq('track_id', opts.trackId)
  if (trackIds)      query = query.in('track_id', trackIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getReview(id: string): Promise<Review | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, draft:drafts(id,title), track:tracks(id,name,color)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createReview(input: ReviewInput): Promise<ActionResult<Review>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      draft_id: input.draft_id,
      track_id: input.track_id ?? null,
      persona:  input.persona ?? null,
      feedback: input.feedback,
      severity: input.severity ?? 'minor',
      category: input.category ?? 'other',
      resolved: input.resolved ?? false,
      tags:     input.tags ?? [],
    })
    .select('*, draft:drafts(id,title), track:tracks(id,name,color)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/redteam')
  revalidatePath(`/draft/${input.draft_id}`)
  return { success: true, data }
}

export async function updateReview(id: string, input: Partial<ReviewInput>): Promise<ActionResult<Review>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .update(input)
    .eq('id', id)
    .select('*, draft:drafts(id,title), track:tracks(id,name,color)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/redteam')
  return { success: true, data }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/redteam')
  return { success: true, data: undefined }
}
