'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Track, TrackInput } from '@/lib/types'

export async function getTracks(projectId?: string | null): Promise<Track[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tracks')
    .select('*, papers(count), project:projects(id, name), parent_track:tracks!parent_track_id(id, name)')
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => ({
    ...t,
    paper_count: (t.papers as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export async function getTrack(id: string): Promise<Track | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tracks')
    .select('*, papers(count), project:projects(id, name), parent_track:tracks!parent_track_id(id, name)')
    .eq('id', id)
    .single()

  if (error) return null

  return {
    ...data,
    paper_count: (data.papers as unknown as { count: number }[])?.[0]?.count ?? 0,
  }
}

export async function createTrack(input: TrackInput): Promise<ActionResult<Track>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      project_id:      input.project_id      ?? null,
      parent_track_id: input.parent_track_id ?? null,
      relation_type:   input.relation_type   ?? 'parallel',
      name:            input.name,
      description:     input.description     ?? null,
      research_intent: input.research_intent ?? null,
      color:           input.color           ?? '#6366f1',
      status:          input.status          ?? 'active',
      tags:            input.tags            ?? [],
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracks')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateTrack(
  id: string,
  input: Partial<TrackInput>,
): Promise<ActionResult<Track>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tracks')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracks')
  revalidatePath(`/tracks/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteTrack(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('tracks').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracks')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}
