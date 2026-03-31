'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Asset, AssetInput } from '@/lib/types'

export async function getAssets(projectId?: string | null): Promise<Asset[]> {
  const supabase = await createClient()
  let query = supabase
    .from('assets')
    .select('*, project:projects(id, name)')
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAsset(id: string): Promise<Asset | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*, project:projects(id, name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createAsset(input: AssetInput): Promise<ActionResult<Asset>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .insert({
      project_id: input.project_id ?? null,
      type:       input.type       ?? 'note',
      title:      input.title,
      content:    input.content    ?? null,
      source:     input.source     ?? null,
      tags:       input.tags       ?? [],
    })
    .select('*, project:projects(id, name)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/assets')
  return { success: true, data }
}

export async function updateAsset(id: string, input: Partial<AssetInput>): Promise<ActionResult<Asset>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(input)
    .eq('id', id)
    .select('*, project:projects(id, name)')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  return { success: true, data }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/assets')
  return { success: true, data: undefined }
}
