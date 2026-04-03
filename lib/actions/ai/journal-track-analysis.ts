'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/ai/generate'
import type { FitLevel, TrackFitAnalysis } from '@/lib/types'

interface TrackInput {
  id:              string
  name:            string
  color:           string
  research_intent: string | null
}

export type JournalTrackAnalysisResult =
  | { success: true;  data: TrackFitAnalysis[] }
  | { success: false; error: string }

/**
 * 저널 1개 × 프로젝트 내 모든 활성 트랙에 대해 AI Fit 분석을 실행하고,
 * 결과를 journals.track_analyses 에 저장한다.
 */
export async function analyzeJournalTrackFit(
  journalId:            string,
  journalName:          string,
  journalScope:         string | null,
  journalIF:            number | null,
  tracks:               TrackInput[],
  projectResearchIntent: string | null,
): Promise<JournalTrackAnalysisResult> {
  if (tracks.length === 0) {
    return { success: false, error: '분석할 트랙이 없습니다. 먼저 트랙을 생성하세요.' }
  }

  const trackDescriptions = tracks
    .map((t, i) =>
      `Track ${i + 1}: "${t.name}"
  Research intent: ${t.research_intent ?? '(미설정)'}`,
    )
    .join('\n\n')

  const prompt = `You are an expert academic journal strategist.

Analyze the fit between the following journal and each of the research tracks listed below.

---
Journal: ${journalName}
Impact Factor: ${journalIF != null ? journalIF.toFixed(1) : 'unknown'}
Scope: ${journalScope ?? '(not provided — infer from journal name)'}
---
Project-level Research Intent: ${projectResearchIntent ?? '(not provided)'}
---
Research Tracks:
${trackDescriptions}
---

For each track, output a JSON array of exactly ${tracks.length} objects:
[
  {
    "track_id": "<exact track id from input>",
    "fit_level": "optimal | adequate | insufficient | excessive",
    "fit_reason": "Korean: 2–3 sentences. Explain WHY this fit level — cite specific aspects of the journal scope vs. the track's research intent. Be concrete, not generic."
  },
  ...
]

fit_level definitions:
- optimal: journal scope, depth, and IF well-match the track's research
- adequate: publishable but 1-2 aspects (scope breadth, novelty bar, IF tier) need strengthening
- insufficient: the track's research doesn't meet this journal's expectations (too narrow, insufficient novelty, wrong domain)
- excessive: the journal is far broader or more competitive than this track's research warrants

Track IDs (use exactly as given): ${tracks.map((t) => `"${t.id}"`).join(', ')}

Return ONLY the JSON array. No markdown, no explanation.`

  let rawList: { track_id: string; fit_level: FitLevel; fit_reason: string }[]

  try {
    const parsed = await generateJson<
      | { track_id: string; fit_level: FitLevel; fit_reason: string }[]
      | { analyses?: unknown[]; data?: unknown[]; results?: unknown[] }
    >(prompt, 0.3, { skipFrameworkProtocol: true })

    rawList = Array.isArray(parsed)
      ? (parsed as typeof rawList)
      : (((parsed as Record<string, unknown>).analyses
          ?? (parsed as Record<string, unknown>).data
          ?? (parsed as Record<string, unknown>).results
          ?? []) as typeof rawList)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI 오류: ${msg}` }
  }

  if (!rawList.length) {
    return { success: false, error: 'AI가 분석 결과를 반환하지 않았습니다. 다시 시도해 주세요.' }
  }

  // 원본 track 정보와 AI 결과를 합쳐 TrackFitAnalysis 배열 생성
  const now = new Date().toISOString()
  const analyses: TrackFitAnalysis[] = rawList
    .map((r) => {
      const track = tracks.find((t) => t.id === r.track_id)
      if (!track) return null
      return {
        track_id:    track.id,
        track_name:  track.name,
        track_color: track.color,
        fit_level:   r.fit_level,
        fit_reason:  r.fit_reason,
        analyzed_at: now,
      } satisfies TrackFitAnalysis
    })
    .filter((a): a is TrackFitAnalysis => a !== null)

  // DB에 저장
  const supabase = await createClient()
  const { error } = await supabase
    .from('journals')
    .update({ track_analyses: analyses })
    .eq('id', journalId)

  if (error) {
    return { success: false, error: `저장 실패: ${error.message}` }
  }

  revalidatePath('/journal')
  return { success: true, data: analyses }
}
