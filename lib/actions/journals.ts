'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Journal, JournalInput } from '@/lib/types'

export async function getJournals(projectId?: string | null): Promise<Journal[]> {
  if (!projectId) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journals')
    .select('*, project:projects(id, name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getJournal(id: string): Promise<Journal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journals')
    .select('*, project:projects(id, name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createJournal(input: JournalInput): Promise<ActionResult<Journal>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journals')
    .insert({
      project_id:     input.project_id     ?? null,
      name:           input.name,
      publisher:      input.publisher      ?? null,
      issn:           input.issn           ?? null,
      impact_factor:  input.impact_factor  ?? null,
      scope:          input.scope          ?? null,
      website:        input.website        ?? null,
      submission_url: input.submission_url ?? null,
      status:         input.status         ?? 'considering',
      notes:          input.notes          ?? null,
      tags:           input.tags           ?? [],
    })
    .select('*, project:projects(id, name)')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/journal')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateJournal(
  id: string,
  input: Partial<JournalInput>,
): Promise<ActionResult<Journal>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journals')
    .update(input)
    .eq('id', id)
    .select('*, project:projects(id, name)')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/journal')
  revalidatePath(`/journal/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteJournal(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('journals').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/journal')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}
