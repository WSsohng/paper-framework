'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Draft, DraftInput } from '@/lib/types'

export async function getDrafts(
  opts: { trackId?: string; projectId?: string } = {},
): Promise<Draft[]> {
  if (!opts.projectId && !opts.trackId) return []
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
    .from('drafts')
    .select('*, track:tracks(id,name,color), journal:journals(id,name)')
    .order('created_at', { ascending: false })

  if (opts.trackId) query = query.eq('track_id', opts.trackId)
  if (trackIds)     query = query.in('track_id', trackIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getDraft(id: string): Promise<Draft | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drafts')
    .select('*, track:tracks(id,name,color), journal:journals(id,name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createDraft(input: DraftInput): Promise<ActionResult<Draft>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      track_id:   input.track_id ?? null,
      journal_id: input.journal_id ?? null,
      title:      input.title,
      abstract:   input.abstract ?? null,
      body:       input.body ?? null,
      status:     input.status ?? 'outline',
      word_count: input.word_count ?? null,
      notes:      input.notes ?? null,
      tags:       input.tags ?? [],
    })
    .select('*, track:tracks(id,name,color), journal:journals(id,name)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/draft')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateDraft(id: string, input: Partial<DraftInput>): Promise<ActionResult<Draft>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drafts')
    .update(input)
    .eq('id', id)
    .select('*, track:tracks(id,name,color), journal:journals(id,name)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/draft')
  revalidatePath(`/draft/${id}`)
  return { success: true, data }
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('drafts').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/draft')
  return { success: true, data: undefined }
}
