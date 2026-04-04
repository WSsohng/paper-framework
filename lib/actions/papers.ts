'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Paper, PaperInput } from '@/lib/types'

export async function getPapers(
  opts: { trackId?: string; projectId?: string } = {},
): Promise<Paper[]> {
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
    .from('papers')
    .select('*, track:tracks(id, name, color)')
    .order('created_at', { ascending: false })

  if (opts.trackId) query = query.eq('track_id', opts.trackId)
  if (trackIds)     query = query.in('track_id', trackIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPaper(id: string): Promise<Paper | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('papers')
    .select('*, track:tracks(id, name, color)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createPaper(input: PaperInput): Promise<ActionResult<Paper>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('papers')
    .insert({
      track_id: input.track_id ?? null,
      title: input.title,
      authors: input.authors ?? [],
      journal: input.journal ?? null,
      year: input.year ?? null,
      doi: input.doi ?? null,
      abstract: input.abstract ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'unread',
      tags: input.tags ?? [],
    })
    .select('*, track:tracks(id, name, color)')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/papers')
  revalidatePath('/dashboard')
  if (input.track_id) revalidatePath(`/tracks/${input.track_id}`)
  return { success: true, data }
}

export async function updatePaper(
  id: string,
  input: Partial<PaperInput>,
): Promise<ActionResult<Paper>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('papers')
    .update(input)
    .eq('id', id)
    .select('*, track:tracks(id, name, color)')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/papers')
  revalidatePath(`/papers/${id}`)
  revalidatePath('/dashboard')
  if (data.track_id) revalidatePath(`/tracks/${data.track_id}`)
  return { success: true, data }
}

export async function deletePaper(id: string, trackId?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('papers').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/papers')
  revalidatePath('/dashboard')
  if (trackId) revalidatePath(`/tracks/${trackId}`)
  return { success: true, data: undefined }
}

export async function getDashboardStats(projectId?: string | null) {
  const supabase = await createClient()

  let tracksQuery = supabase.from('tracks').select('id, status')
  if (projectId) tracksQuery = tracksQuery.eq('project_id', projectId)

  const { data: trackData = [] } = await tracksQuery
  const trackIds = (trackData ?? []).map((t: { id: string }) => t.id)

  let papersQuery = supabase.from('papers').select('status')
  if (trackIds.length > 0) papersQuery = papersQuery.in('track_id', trackIds)
  else if (projectId)      return { total_tracks: 0, active_tracks: 0, total_papers: 0, key_papers: 0, unread_papers: 0 }

  const { data: paperData = [] } = await papersQuery

  return {
    total_tracks:  (trackData ?? []).length,
    active_tracks: (trackData ?? []).filter((t: { status: string }) => t.status === 'active').length,
    total_papers:  (paperData ?? []).length,
    key_papers:    (paperData ?? []).filter((p: { status: string }) => p.status === 'key').length,
    unread_papers: (paperData ?? []).filter((p: { status: string }) => p.status === 'unread').length,
  }
}
