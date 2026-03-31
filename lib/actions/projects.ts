'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Project, ProjectInput } from '@/lib/types'

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createProject(input: ProjectInput): Promise<ActionResult<Project>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name:            input.name,
      description:     input.description     ?? null,
      research_intent: input.research_intent ?? null,
      status:          input.status          ?? 'active',
      tags:            input.tags            ?? [],
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, data }
}

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<ActionResult<Project>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}
