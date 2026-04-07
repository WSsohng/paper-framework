'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Asset, AssetInput } from '@/lib/types'

const ASSET_SELECT = '*, project:projects(id, name), reference_paper:reference_papers(id, title, year, journal, tier, concepts)'

export async function getAssets(projectId?: string | null): Promise<Asset[]> {
  if (!projectId) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAsset(id: string): Promise<Asset | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SELECT)
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
      project_id:         input.project_id         ?? null,
      type:               input.type               ?? 'note',
      title:              input.title,
      content:            input.content            ?? null,
      source:             input.source             ?? null,
      reference_paper_id: input.reference_paper_id ?? null,
      paper_section:      input.paper_section      ?? null,
      tags:               input.tags               ?? [],
    })
    .select(ASSET_SELECT)
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
    .select(ASSET_SELECT)
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
