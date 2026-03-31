'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Figure, FigureInput } from '@/lib/types'

export async function getFigures(
  opts: { trackId?: string; projectId?: string } = {},
): Promise<Figure[]> {
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
    .from('figures')
    .select('*, track:tracks(id,name,color), draft:drafts(id,title)')
    .order('created_at', { ascending: false })

  if (opts.trackId) query = query.eq('track_id', opts.trackId)
  if (trackIds)     query = query.in('track_id', trackIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getFigure(id: string): Promise<Figure | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('figures')
    .select('*, track:tracks(id,name,color), draft:drafts(id,title)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createFigure(input: FigureInput): Promise<ActionResult<Figure>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('figures')
    .insert({
      track_id:    input.track_id ?? null,
      draft_id:    input.draft_id ?? null,
      title:       input.title,
      type:        input.type ?? 'chart',
      caption:     input.caption ?? null,
      description: input.description ?? null,
      file_url:    input.file_url ?? null,
      status:      input.status ?? 'planned',
      tags:        input.tags ?? [],
    })
    .select('*, track:tracks(id,name,color), draft:drafts(id,title)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/figures')
  return { success: true, data }
}

export async function updateFigure(id: string, input: Partial<FigureInput>): Promise<ActionResult<Figure>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('figures')
    .update(input)
    .eq('id', id)
    .select('*, track:tracks(id,name,color), draft:drafts(id,title)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/figures')
  revalidatePath(`/figures/${id}`)
  return { success: true, data }
}

export async function deleteFigure(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('figures').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/figures')
  return { success: true, data: undefined }
}
