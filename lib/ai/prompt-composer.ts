/**
 * Prompt Composer — role / objective / context sections / reasoning / output spec 를 합쳐
 * 최종 프롬프트 문자열을 생성한다 (Phase 2A).
 *
 * `generateJson()` 시그니처는 변경하지 않는다. 호출부는 다음 패턴으로 표준화된다:
 *
 *   const { sections } = await new AIContextBuilder({ projectId })
 *     .withResearchIntent()
 *     .withReferencePapers({ tierMin: 2 })
 *     .build()
 *
 *   const prompt = composePrompt({
 *     role:      '당신은 학술 논문 연구 설계 전문가입니다.',
 *     objective: '연구 의도에 맞는 가설을 도출하세요.',
 *     reasoning: ['참고문헌 주장을 분석', '실험 방법론 제안'],
 *     output:    { kind: 'array', shape: `{...}`, count: { min: 5, max: 8 } },
 *   }, { sections })
 *
 *   await generateJson(prompt, 0.5, { meta: { feature: 'hypothesis_generation' }})
 */

import type { PromptLang, PromptSection } from '@/lib/ai/context-builder'

// ── 공개 타입 ────────────────────────────────────────────

export interface OutputCount {
  min?:   number
  max?:   number
  /** `min`/`max` 대신 정확한 개수를 강제 */
  exact?: number
}

export interface OutputSpec {
  kind:     'array' | 'object'
  /**
   * 각 항목의 shape. TS interface 또는 예시 JSON 를 그대로 문자열로 넘긴다.
   *
   *   shape: `{
   *     title: string
   *     confidence: number   // 0~100
   *   }`
   */
  shape:    string
  /** array 일 때 개수 제약 */
  count?:   OutputCount
  /** array 일 때 정렬 지시 */
  orderBy?: string
}

export interface PromptTask {
  role:       string
  objective:  string
  /** 내부 추론 단계 가이드. 출력에 드러나지 않도록 지시. */
  reasoning?: string[]
  output:     OutputSpec
  /** Do/Don't 추가 노트 */
  notes?:     string[]
  /** default: 'ko' */
  lang?:      PromptLang
}

// ── 다국어 정형구 ────────────────────────────────────────

const LABELS: Record<PromptLang, {
  reasoningHeader: string
  outputArrayHeader: (spec: OutputSpec) => string
  outputObjectHeader: string
  orderByPrefix: string
  jsonOnly: string
}> = {
  ko: {
    reasoningHeader: '다음 단계로 내부 추론하세요 (출력에 단계 설명을 포함하지 마세요):',
    outputArrayHeader: (spec) => {
      const count = formatCountKo(spec.count)
      return `아래 JSON 배열 형식으로만 응답하세요 (설명·마크다운 없이${count ? `, ${count}` : ''}):`
    },
    outputObjectHeader: '아래 JSON 객체 형식으로만 응답하세요 (설명·마크다운 없이):',
    orderByPrefix: '정렬: ',
    jsonOnly: '순수 JSON 만 반환 — 다른 텍스트 금지.',
  },
  en: {
    reasoningHeader: 'Reason through the following steps internally (do NOT include them in the output):',
    outputArrayHeader: (spec) => {
      const count = formatCountEn(spec.count)
      return `Return ONLY a valid JSON array${count ? ` (${count})` : ''} — no markdown, no prose:`
    },
    outputObjectHeader: 'Return ONLY a valid JSON object — no markdown, no prose:',
    orderByPrefix: 'Order by ',
    jsonOnly: 'Pure JSON only — no other text.',
  },
}

function formatCountKo(c: OutputCount | undefined): string {
  if (!c) return ''
  if (c.exact != null) return `정확히 ${c.exact}개`
  if (c.min != null && c.max != null) return `${c.min}~${c.max}개`
  if (c.min != null) return `최소 ${c.min}개`
  if (c.max != null) return `최대 ${c.max}개`
  return ''
}

function formatCountEn(c: OutputCount | undefined): string {
  if (!c) return ''
  if (c.exact != null) return `exactly ${c.exact} items`
  if (c.min != null && c.max != null) return `${c.min}–${c.max} items`
  if (c.min != null) return `at least ${c.min} items`
  if (c.max != null) return `at most ${c.max} items`
  return ''
}

// ── 렌더러 ────────────────────────────────────────────

/**
 * task + ctx.sections → 최종 프롬프트 문자열.
 * withFrameworkProtocol() 은 generate.ts 가 옵션에 따라 붙이므로 여기서는 붙이지 않는다.
 */
export function composePrompt(
  task: PromptTask,
  ctx: { sections: PromptSection[] },
): string {
  const lang = task.lang ?? 'ko'
  const labels = LABELS[lang]

  const chunks: string[] = []

  // 1) Role + Objective
  chunks.push(task.role.trim())
  chunks.push(task.objective.trim())

  // 2) Context sections
  for (const s of ctx.sections) {
    if (!s.body.trim()) continue
    chunks.push(`[${s.title}]\n${s.body.trim()}`)
  }

  // 3) Separator
  if (ctx.sections.length) chunks.push('---')

  // 4) Reasoning
  if (task.reasoning && task.reasoning.length) {
    const steps = task.reasoning
      .map((r, i) => `${i + 1}. ${r.trim()}`)
      .join('\n')
    chunks.push(`${labels.reasoningHeader}\n${steps}`)
  }

  // 5) Output spec
  chunks.push(renderOutputSpec(task.output, labels))

  // 6) Notes
  if (task.notes && task.notes.length) {
    chunks.push(task.notes.map((n) => `- ${n.trim()}`).join('\n'))
  }

  // 7) Final JSON-only reminder
  chunks.push(labels.jsonOnly)

  return chunks.join('\n\n')
}

function renderOutputSpec(
  spec: OutputSpec,
  labels: (typeof LABELS)[PromptLang],
): string {
  const parts: string[] = []

  if (spec.kind === 'array') {
    parts.push(labels.outputArrayHeader(spec))
    parts.push(`[\n  ${spec.shape.trim()}\n]`)
  } else {
    parts.push(labels.outputObjectHeader)
    parts.push(spec.shape.trim())
  }

  if (spec.orderBy) {
    parts.push(`${labels.orderByPrefix}${spec.orderBy}`)
  }

  return parts.join('\n')
}
