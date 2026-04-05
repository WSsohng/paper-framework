'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/ai/generate'
import type { ActionResult, PaperTier } from '@/lib/types'

// ── 우선순위 점수 계산 ─────────────────────────────────────
// tier(45%) + 최신성(15%) + 관련도(40%) — 0~100점

function computePriorityScore(
  tier: PaperTier | null,
  year: number | null,
  relevanceScore: number,
): number {
  const currentYear = new Date().getFullYear()

  // Tier 가중치
  const tierScore = tier === 1 ? 100 : tier === 2 ? 65 : tier === 3 ? 30 : 10

  // 최신성: 0년 = 100점, 10년 이상 = 0점 (선형 감소)
  const age = year ? Math.max(0, currentYear - year) : 5
  const recencyScore = Math.max(0, Math.min(100, 100 - age * 10))

  return Math.round(tierScore * 0.45 + recencyScore * 0.15 + relevanceScore * 100 * 0.40)
}

// ── AI 응답 타입 ─────────────────────────────────────────

interface ConceptExtractionResult {
  concepts:        string[]   // 5–8개 핵심 개념 키워드
  relevance_score: number     // 0.0–1.0
  relevance_reason: string    // 관련도 판단 근거 (한 문장)
}

// ── 단일 논문 분석 ────────────────────────────────────────

export async function extractPaperConcepts(
  paperId: string,
  researchIntent: string,
): Promise<ActionResult<{ concepts: string[]; priority_score: number }>> {
  const supabase = await createClient()

  const { data: paper, error: fetchErr } = await supabase
    .from('reference_papers')
    .select('title, abstract, notes, year, tier, project_id')
    .eq('id', paperId)
    .single()

  if (fetchErr || !paper) return { success: false, error: '논문을 찾을 수 없습니다.' }

  const prompt = `
다음 논문을 분석해서 JSON으로만 응답하세요.

[프로젝트 Research Intent]
${researchIntent}

[논문 정보]
제목: ${paper.title}
연도: ${paper.year ?? '불명'}
Abstract: ${paper.abstract ?? '(없음)'}
메모: ${paper.notes ?? '(없음)'}

아래 JSON 형식으로 응답:
{
  "concepts": ["개념1", "개념2", ..., "개념N"],
  "relevance_score": 0.0~1.0,
  "relevance_reason": "한 문장으로 관련도 판단 근거"
}

규칙:
- concepts: 5~8개, 영어 또는 한국어 단어/구문, 논문의 핵심 방법론·데이터셋·지표·발견을 포함
- relevance_score: Research Intent와의 주제·방법·분야 일치도 (1.0=완벽 일치, 0.0=무관)
- relevance_reason: 왜 이 점수인지 구체적으로 (저널명·방법론·결과 언급 포함)
`.trim()

  let result: ConceptExtractionResult
  try {
    result = await generateJson<ConceptExtractionResult>(prompt, 0.3, {
      skipFrameworkProtocol: true,
      meta: { feature: 'concept_extraction', projectId: (paper as { project_id?: string }).project_id ?? undefined },
    })
  } catch (e) {
    return { success: false, error: `AI 분석 실패: ${e instanceof Error ? e.message : String(e)}` }
  }

  const relevanceScore = Math.max(0, Math.min(1, result.relevance_score ?? 0))
  const priorityScore  = computePriorityScore(
    paper.tier as PaperTier | null,
    paper.year,
    relevanceScore,
  )

  const { error: updateErr } = await supabase
    .from('reference_papers')
    .update({
      concepts:        result.concepts ?? [],
      relevance_score: relevanceScore,
      priority_score:  priorityScore,
    })
    .eq('id', paperId)

  if (updateErr) return { success: false, error: updateErr.message }

  revalidatePath('/reference-papers')

  return {
    success: true,
    data: { concepts: result.concepts ?? [], priority_score: priorityScore },
  }
}

// ── 프로젝트 전체 논문 일괄 분석 ─────────────────────────
// 아직 concepts가 없는 논문만 대상으로 처리

export async function batchExtractConcepts(
  projectId: string,
  researchIntent: string,
  forceAll = false,  // true = intent 변경 후 전체 재분석
): Promise<ActionResult<{ processed: number; skipped: number }>> {
  const supabase = await createClient()

  const { data: papers, error } = await supabase
    .from('reference_papers')
    .select('id, concepts')
    .eq('project_id', projectId)

  if (error) return { success: false, error: error.message }

  const unanalyzed = forceAll
    ? (papers ?? [])
    : (papers ?? []).filter((p) => !p.concepts || p.concepts.length === 0)

  let processed = 0
  let failed    = 0

  for (const paper of unanalyzed) {
    const result = await extractPaperConcepts(paper.id, researchIntent)
    if (result.success) processed++
    else failed++
    // 연속 요청 간 간격 (rate limit 방지)
    await new Promise((r) => setTimeout(r, 300))
  }

  revalidatePath('/reference-papers')

  return {
    success: true,
    data: {
      processed,
      skipped: (papers?.length ?? 0) - unanalyzed.length,
    },
  }
}

// ── 우선순위 점수 재계산 (tier 변경 시) ──────────────────
// tier만 바꿨을 때 AI 재호출 없이 점수만 갱신

export async function recalcPriorityScore(paperId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: paper, error } = await supabase
    .from('reference_papers')
    .select('tier, year, relevance_score')
    .eq('id', paperId)
    .single()

  if (error || !paper) return { success: false, error: '논문 없음' }
  if (paper.relevance_score == null) return { success: false, error: 'AI 분석 먼저 실행 필요' }

  const newScore = computePriorityScore(
    paper.tier as PaperTier | null,
    paper.year,
    paper.relevance_score,
  )

  await supabase
    .from('reference_papers')
    .update({ priority_score: newScore })
    .eq('id', paperId)

  revalidatePath('/reference-papers')
  return { success: true, data: undefined }
}
