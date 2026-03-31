'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Hypothesis, HypothesisInput } from '@/lib/types'

export async function getHypotheses(
  opts: { trackId?: string; projectId?: string } = {},
): Promise<Hypothesis[]> {
  const supabase = await createClient()

  // When filtering by project, resolve track IDs first
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
    .from('hypotheses')
    .select('*, track:tracks(id,name,color)')
    .order('created_at', { ascending: false })

  if (opts.trackId) query = query.eq('track_id', opts.trackId)
  if (trackIds)     query = query.in('track_id', trackIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hypotheses')
    .select('*, track:tracks(id,name,color)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createHypothesis(input: HypothesisInput): Promise<ActionResult<Hypothesis>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hypotheses')
    .insert({
      track_id:  input.track_id ?? null,
      title:     input.title,
      statement: input.statement ?? null,
      rationale: input.rationale ?? null,
      status:    input.status ?? 'draft',
      tags:      input.tags ?? [],
    })
    .select('*, track:tracks(id,name,color)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/architect')
  return { success: true, data }
}

export async function updateHypothesis(id: string, input: Partial<HypothesisInput>): Promise<ActionResult<Hypothesis>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hypotheses')
    .update(input)
    .eq('id', id)
    .select('*, track:tracks(id,name,color)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/architect')
  revalidatePath(`/architect/${id}`)
  return { success: true, data }
}

export async function deleteHypothesis(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('hypotheses').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/architect')
  return { success: true, data: undefined }
}
