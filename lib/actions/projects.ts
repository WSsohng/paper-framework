'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSelectedProjectId } from '@/lib/selected-project'
import { setSelectedProject } from '@/lib/actions/project-context'
import type { ActionResult, Project, ProjectInput, ProjectStatus } from '@/lib/types'

/**
 * 프로젝트 목록 조회.
 * - opts 없음 = active 만 (기본 동작 — 사이드바에서 보관/완료된 프로젝트가 안 보이게)
 * - opts.status = 특정 상태 (보관함 페이지 등)
 * - opts.status = 'all' = 모든 상태
 */
export async function getProjects(
  opts?: { status?: ProjectStatus | 'all' },
): Promise<Project[]> {
  const supabase = await createClient()
  const status   = opts?.status ?? 'active'

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
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

  // Phase 3-pre Q1: 프로젝트 생성 시 AI 예산 기본 행 자동 생성.
  //   - 한도: env `AI_BUDGET_DEFAULT_LIMIT_USD` (기본 $10)
  //   - warning=80%, hard_limit=false (경고만, 안전 기본값)
  //   - 사용자는 이후 upsertAiBudget 으로 변경 가능
  //   - 실패는 프로젝트 생성 흐름을 막지 않음 (로그만 남김)
  const defaultLimit = Number(process.env.AI_BUDGET_DEFAULT_LIMIT_USD ?? '10')
  if (Number.isFinite(defaultLimit) && defaultLimit > 0) {
    const { error: budgetErr } = await supabase
      .from('ai_budgets')
      .insert({
        project_id:            data.id,
        monthly_limit_usd:     defaultLimit,
        warning_threshold_pct: 80,
        hard_limit_enabled:    false,
      })
    if (budgetErr) {
      console.warn('[createProject] ai_budgets 기본 행 생성 실패:', budgetErr.message)
    }
  }

  revalidatePath('/', 'layout')
  return { success: true, data }
}

export async function updateProject(
  id: string,
  input: Partial<ProjectInput & { intent_note?: string }>,
): Promise<ActionResult<Project>> {
  const supabase = await createClient()

  // ── Research Intent 변경 감지 ────────────────────────────
  let intentUpdateFields: Record<string, unknown> = {}

  if ('research_intent' in input) {
    // 현재 저장된 intent 조회
    const { data: current } = await supabase
      .from('projects')
      .select('research_intent, intent_history')
      .eq('id', id)
      .single()

    const oldIntent = current?.research_intent ?? null
    const newIntent = input.research_intent    ?? null

    // 실제로 변경됐을 때만 이력 기록
    if (oldIntent !== newIntent) {
      const now = new Date().toISOString()
      const newEntry = {
        changed_at: now,
        old_intent: oldIntent,
        new_intent: newIntent,
        ...(input.intent_note ? { note: input.intent_note } : {}),
      }
      const existingHistory: unknown[] = Array.isArray(current?.intent_history)
        ? current.intent_history
        : []

      intentUpdateFields = {
        intent_updated_at: now,
        intent_history:    [newEntry, ...existingHistory].slice(0, 20), // 최대 20건 보관
      }
    }
  }

  // intent_note는 DB 컬럼이 없으므로 제거 후 저장
  const { intent_note: _note, ...dbInput } = input as Partial<ProjectInput> & { intent_note?: string }

  const { data, error } = await supabase
    .from('projects')
    .update({ ...dbInput, ...intentUpdateFields })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  revalidatePath('/reference-papers')
  return { success: true, data }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  // 삭제된 프로젝트가 현재 선택 중이면 쿠키 비움 (404 방지)
  const selectedId = await getSelectedProjectId()
  if (selectedId === id) await setSelectedProject(null)

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

/**
 * 프로젝트 보관 (soft delete) — status 를 'archived' 로 변경.
 * 사이드바 셀렉터에서 사라지지만 DB 와 cascade 데이터는 그대로 보존.
 */
export async function archiveProject(id: string): Promise<ActionResult<Project>> {
  const result = await updateProject(id, { status: 'archived' })

  // 보관된 프로젝트가 현재 선택 중이면 쿠키 비움 (셀렉터 일관성)
  if (result.success) {
    const selectedId = await getSelectedProjectId()
    if (selectedId === id) await setSelectedProject(null)
  }

  return result
}

/**
 * 보관 해제 — status 를 'active' 로 복구.
 */
export async function restoreProject(id: string): Promise<ActionResult<Project>> {
  return updateProject(id, { status: 'active' })
}
