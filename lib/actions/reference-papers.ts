'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, ReferencePaper, ReferencePaperInput } from '@/lib/types'

export async function getReferencePapers(projectId: string): Promise<ReferencePaper[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_papers')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getReferencePaper(id: string): Promise<ReferencePaper | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_papers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createReferencePaper(
  input: ReferencePaperInput,
): Promise<ActionResult<ReferencePaper>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_papers')
    .insert({
      project_id: input.project_id,
      title:      input.title,
      authors:    input.authors   ?? [],
      journal:    input.journal   ?? null,
      year:       input.year      ?? null,
      doi:        input.doi       ?? null,
      abstract:   input.abstract  ?? null,
      notes:      input.notes     ?? null,
      status:     input.status    ?? 'unread',
      tags:       input.tags      ?? [],
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateReferencePaper(
  id: string,
  input: Partial<ReferencePaperInput>,
): Promise<ActionResult<ReferencePaper>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reference_papers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  revalidatePath(`/reference-papers/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteReferencePaper(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('reference_papers').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/reference-papers')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}
