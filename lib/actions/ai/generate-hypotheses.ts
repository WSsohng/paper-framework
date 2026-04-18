'use server'

import { generateJson } from '@/lib/ai/generate'
import { AIContextBuilder } from '@/lib/ai/context-builder'
import { composePrompt } from '@/lib/ai/prompt-composer'
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
  /**
   * 호출부가 보유한 researchIntent 값 — 있으면 override, 없으면 builder 가 DB에서 조회.
   * 현재 caller(hypothesis-ai-panel)는 DB 와 동일한 값을 넘긴다.
   */
  researchIntent?: string | null
}

export async function generateHypotheses(
  input: GenerateInput,
): Promise<ActionResult<HypothesisProposal[]>> {
  const { projectId, trackId, researchIntent } = input

  // Phase 2A: Context builder 로 표준화 — 기존 4개 fetch 블록을 1개 체인으로.
  const builder = new AIContextBuilder({
    projectId,
    trackId: trackId ?? undefined,
  })

  if (researchIntent && researchIntent.trim()) {
    builder.withCustom({ id: 'research_intent', title: '연구 의도', body: researchIntent.trim() })
  } else {
    builder.withResearchIntent()
  }

  const { sections, meta } = await builder
    .withReferencePapers({ tierMin: 2, limit: 10, abstractMaxChars: 2000 })
    .withAssets({
      types: ['quote', 'note', 'data'],
      limit: 8,
      title: '연구 자산 (인용·메모·데이터)',
    })
    .withAssets({
      types: ['idea'],
      limit: 8,
      title: '연구 아이디어 메모',
    })
    .withDiscoveryQuestions({ limit: 10 })
    .build()

  if (meta.sectionCount === 0) {
    return {
      success: false,
      error: '참고문헌, 자산, 아이디어 메모가 없습니다. M0에서 논문을 저장하거나 M2에 자산을 추가한 후 다시 시도하세요.',
    }
  }

  const prompt = composePrompt(
    {
      role:      '당신은 학술 논문 연구 설계 전문가입니다.',
      objective: '위 연구 의도로 논문을 쓰려면 실험적으로 검증해야 할 가설들을 도출하세요.',
      reasoning: [
        'T1/T2 참고문헌들이 각각 어떤 주장을 어떻게 증명했는지 분석',
        '이 연구 의도로 논문을 쓰려면 무엇을 증명해야 하는지 역으로 추론',
        '아이디어 메모와 연구 질문을 힌트로 활용',
        '각 가설마다 구체적인 실험 방법론 제안 (측정 지표, 비교 대상, 평가 방법)',
      ],
      output: {
        kind:  'array',
        shape: `{
    "title": "가설의 짧은 이름 (15~40자)",
    "statement": "우리는 [구체적 주장]라고 가설을 세운다.",
    "methodology": "증명 방법: [실험 설계, 측정 지표, 비교 대상, 평가 방식을 2~4문장으로]",
    "rationale": "근거: [어떤 참고문헌/아이디어/연구질문이 이 가설을 지지하는지 1~3문장으로]"
  }`,
        count: { min: 5, max: 8 },
      },
    },
    { sections },
  )

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
