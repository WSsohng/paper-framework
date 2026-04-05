'use server'

import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/ai/generate'
import { upsertTrackRelevance, getUntaggedPaperIds } from '@/lib/actions/reference-paper-tracks'
import type { ActionResult, RelevanceLevel } from '@/lib/types'

// ── AI 응답 타입 ─────────────────────────────────────────

interface RelevanceTagResult {
  relevance_level: 1 | 2 | 3  // R1 / R2 / R3
  reason: string               // 판단 근거 (한두 문장)
}

// ── 단일 논문 연관도 AI 태깅 ─────────────────────────────

export async function tagPaperRelevance(
  paperId: string,
  trackId: string,
  trackResearchIntent: string,
  projectId?: string,
): Promise<ActionResult<{ relevance_level: RelevanceLevel; reason: string }>> {
  const supabase = await createClient()

  const { data: paper, error: fetchErr } = await supabase
    .from('reference_papers')
    .select('title, abstract, notes, year, journal')
    .eq('id', paperId)
    .single()

  if (fetchErr || !paper) return { success: false, error: '논문을 찾을 수 없습니다.' }

  const prompt = `
다음 트랙의 연구 방향과 논문의 연관도를 평가해서 JSON으로만 응답하세요.

[트랙 연구 방향 (Research Intent)]
${trackResearchIntent}

[논문 정보]
제목: ${paper.title}
저널: ${paper.journal ?? '불명'}
연도: ${paper.year ?? '불명'}
Abstract: ${paper.abstract ?? '(없음)'}
메모: ${paper.notes ?? '(없음)'}

아래 JSON 형식으로 응답:
{
  "relevance_level": 1, 2, 또는 3,
  "reason": "판단 근거 (한두 문장)"
}

기준:
- R1 (핵심 연관): 이 트랙이 직접 다루는 방법론·데이터셋·실험 결과·핵심 주제와 정확히 일치
  → 이 논문 없이는 트랙의 연구 주장을 구성할 수 없을 정도로 중요
- R2 (부분 연관): 트랙의 방법론이나 개념을 공유하거나 보강 근거로 활용 가능
  → 관련성은 있지만 트랙의 핵심 주제는 아님
- R3 (배경 연관): 해당 분야의 흐름·배경·상위 개념에 해당
  → 서론·Introduction 수준에서 참조 가능

주의: 연관이 없다면 R3로 평가하고 "이유"를 명확히 설명하세요.
`.trim()

  let result: RelevanceTagResult
  try {
    result = await generateJson<RelevanceTagResult>(prompt, 0.3, {
      skipFrameworkProtocol: true,
      meta: { feature: 'relevance_tagging', projectId },
    })
  } catch (e) {
    return { success: false, error: `AI 분석 실패: ${e instanceof Error ? e.message : String(e)}` }
  }

  const level = [1, 2, 3].includes(result.relevance_level)
    ? (result.relevance_level as RelevanceLevel)
    : 3

  const upsertResult = await upsertTrackRelevance({
    reference_paper_id: paperId,
    track_id:           trackId,
    relevance_level:    level,
    relevance_reason:   result.reason,
    tagged_by:          'ai',
  })

  if (!upsertResult.success) return { success: false, error: upsertResult.error }

  return { success: true, data: { relevance_level: level, reason: result.reason } }
}

// ── 일괄 AI 태깅: 아직 태깅 안 된 논문만 처리 ────────────

export async function batchTagRelevance(
  projectId: string,
  trackId: string,
  trackResearchIntent: string,
  forceAll = false,
): Promise<ActionResult<{ processed: number; skipped: number }>> {
  const supabase = await createClient()

  let paperIds: string[]

  if (forceAll) {
    const { data } = await supabase
      .from('reference_papers')
      .select('id')
      .eq('project_id', projectId)
    paperIds = (data ?? []).map(p => p.id)
  } else {
    paperIds = await getUntaggedPaperIds(projectId, trackId)
  }

  if (paperIds.length === 0) {
    return { success: true, data: { processed: 0, skipped: 0 } }
  }

  let processed = 0
  for (const paperId of paperIds) {
    const result = await tagPaperRelevance(paperId, trackId, trackResearchIntent, projectId)
    if (result.success) processed++
    await new Promise(r => setTimeout(r, 300))
  }

  const totalPapers = forceAll
    ? paperIds.length
    : (await (async () => {
        const { data } = await supabase
          .from('reference_papers')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
        return data?.length ?? 0
      })())

  return {
    success: true,
    data: {
      processed,
      skipped: totalPapers - paperIds.length,
    },
  }
}
