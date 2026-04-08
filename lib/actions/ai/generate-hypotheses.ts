'use server'

import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/ai/generate'
import type { ActionResult } from '@/lib/types'

export interface HypothesisProposal {
  title:       string  // 짧은 가설 이름 (10~30자)
  statement:   string  // "우리는 …라고 가설을 세운다" 형식의 가설 진술
  methodology: string  // 어떻게 증명할 것인가 — 실험 설계, 측정 지표, 비교 대상
  rationale:   string  // 왜 이 가설이 필요한가 — 선행 논문/아이디어/연구질문 근거
}

interface GenerateInput {
  projectId:      string
  trackId?:       string | null
  researchIntent: string | null
}

export async function generateHypotheses(
  input: GenerateInput,
): Promise<ActionResult<HypothesisProposal[]>> {
  const { projectId, trackId, researchIntent } = input
  const supabase = await createClient()

  // ── 1. 참고문헌 수집 (T1 우선, 최대 10편) ────────────────
  const { data: papers } = await supabase
    .from('reference_papers')
    .select('title, journal, year, abstract, tier')
    .eq('project_id', projectId)
    .not('abstract', 'is', null)
    .order('tier', { ascending: true, nullsFirst: false })
    .limit(10)

  const paperContext = (papers ?? [])
    .map((p) => {
      const tierLabel = p.tier ? `T${p.tier}` : '?'
      const abstract  = (p.abstract ?? '').slice(0, 2000)
      return `[${tierLabel}] ${p.title}${p.year ? ` (${p.year})` : ''}${p.journal ? ` — ${p.journal}` : ''}\n${abstract}`
    })
    .join('\n\n')

  // ── 2. M2 자산 수집 (논문 연결 quotes/notes, 최대 8개) ───
  const { data: linkedAssets } = await supabase
    .from('assets')
    .select('title, content, type')
    .eq('project_id', projectId)
    .in('type', ['quote', 'note', 'data'])
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8)

  const assetContext = (linkedAssets ?? [])
    .map((a) => `[${a.type}] ${a.title}: ${(a.content ?? '').slice(0, 300)}`)
    .join('\n')

  // ── 3. 아이디어 메모 수집 (type='idea', 최대 8개) ─────────
  const { data: ideaAssets } = await supabase
    .from('assets')
    .select('title, content')
    .eq('project_id', projectId)
    .eq('type', 'idea')
    .order('created_at', { ascending: false })
    .limit(8)

  const ideaContext = (ideaAssets ?? [])
    .map((a) => `• ${a.title}${a.content ? `: ${a.content.slice(0, 300)}` : ''}`)
    .join('\n')

  // ── 4. M0 연구 질문 수집 (최근 10개 라운드의 question) ────
  const { data: rounds } = await supabase
    .from('discovery_rounds')
    .select('question')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  const questionContext = (rounds ?? [])
    .map((r, i) => `${i + 1}. ${r.question}`)
    .join('\n')

  // ── 5. Claude 프롬프트 ────────────────────────────────────
  const hasContext = paperContext || assetContext || ideaContext || questionContext

  if (!hasContext) {
    return {
      success: false,
      error: '참고문헌, 자산, 아이디어 메모가 없습니다. M0에서 논문을 저장하거나 M2에 자산을 추가한 후 다시 시도하세요.',
    }
  }

  const prompt = `당신은 학술 논문 연구 설계 전문가입니다.

아래 연구 의도를 가진 논문을 작성하려 합니다.
이 논문의 주장이 정당화되려면 어떤 가설들이 실험적으로 검증되어야 하는지 도출해주세요.

${researchIntent ? `[연구 의도]
${researchIntent}

` : ''}${paperContext ? `[참고문헌 — T1/T2 우선 선별, Abstract 전문 포함]
${paperContext}` : ''}

${assetContext ? `[M2 연구 자산 (인용구·메모·데이터)]
${assetContext}` : ''}

${ideaContext ? `[연구 아이디어 메모]
${ideaContext}` : ''}

${questionContext ? `[M0 연구 탐색 질문들]
${questionContext}` : ''}

---

위 정보를 종합하여 5~8개의 가설을 제안하세요.

가설 도출 방법:
1. T1/T2 참고문헌들이 각각 어떤 주장을 어떻게 증명했는지 분석하세요.
2. 이 연구 의도로 논문을 쓰려면 무엇을 증명해야 하는지 역으로 추론하세요.
3. 아이디어 메모와 연구 질문을 힌트로 활용하세요.
4. 각 가설마다 구체적인 실험 방법론을 제안하세요 (측정 지표, 비교 대상, 평가 방법).

아래 JSON 배열 형식으로만 응답하세요 (설명 없이):
[
  {
    "title": "가설의 짧은 이름 (15~40자)",
    "statement": "우리는 [구체적 주장]라고 가설을 세운다.",
    "methodology": "증명 방법: [실험 설계, 측정 지표, 비교 대상, 평가 방식을 2~4문장으로]",
    "rationale": "근거: [어떤 참고문헌/아이디어/연구질문이 이 가설을 지지하는지 1~3문장으로]"
  }
]`

  let proposals: HypothesisProposal[]
  try {
    proposals = await generateJson<HypothesisProposal[]>(prompt, 0.5, {
      skipFrameworkProtocol: true,
      meta: { feature: 'hypothesis_generation', projectId },
      maxTokens: 4096,
    })
  } catch (err) {
    return {
      success: false,
      error: `AI 오류: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  if (!Array.isArray(proposals) || proposals.length === 0) {
    return { success: false, error: 'AI가 가설을 반환하지 않았습니다. 다시 시도해 주세요.' }
  }

  return { success: true, data: proposals.slice(0, 8) }
}
