'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { analyzeJournalTrackFit } from './journal-track-analysis'
import type { ActionResult } from '@/lib/types'

interface TrackInput {
  id:              string
  name:            string
  color:           string
  research_intent: string | null
}

/**
 * 프로젝트 내 모든 저널에 대해 트랙 Fit 분석을 순차적으로 실행한다.
 * 이미 분석된 저널은 건너뛰고 미분석 저널만 처리한다.
 * `forceAll=true`이면 기존 분석 결과도 재분석한다.
 */
export async function batchAnalyzeJournalTracks(
  projectId: string,
  tracks: TrackInput[],
  projectResearchIntent: string | null,
  forceAll = false,
): Promise<ActionResult<{ processed: number; skipped: number; failed: number }>> {
  if (tracks.length === 0) {
    return { success: false, error: '분석할 트랙이 없습니다. 먼저 트랙을 생성하세요.' }
  }

  const supabase = await createClient()
  const { data: journals, error } = await supabase
    .from('journals')
    .select('id, name, scope, impact_factor, track_analyses')
    .eq('project_id', projectId)

  if (error) return { success: false, error: error.message }
  if (!journals || journals.length === 0) {
    return { success: false, error: '분석할 저널이 없습니다.' }
  }

  const target = forceAll
    ? journals
    : journals.filter(
        (j) => !j.track_analyses || (j.track_analyses as unknown[]).length === 0,
      )

  let processed = 0
  let failed    = 0

  for (const journal of target) {
    const result = await analyzeJournalTrackFit(
      journal.id,
      journal.name,
      journal.scope ?? null,
      journal.impact_factor ?? null,
      tracks,
      projectResearchIntent,
    )
    if (result.success) processed++
    else failed++
    // 연속 API 호출 간격
    await new Promise((r) => setTimeout(r, 400))
  }

  revalidatePath('/journal')
  return {
    success: true,
    data: {
      processed,
      skipped: journals.length - target.length,
      failed,
    },
  }
}
