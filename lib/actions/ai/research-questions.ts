'use server'

/**
 * AI 연구 질문 생성 서버 액션.
 *
 * 중요: 이 파일은 `'use server'` 이므로 **async 함수만** export 할 수 있다.
 * 타입·상수(DOMAIN_LABEL, MODE_LABEL 등)는 `lib/types/research-questions.ts` 에 있다.
 * 상수를 이 파일에 추가하면 Turbopack 이 모듈 로드를 실패시킨다:
 *   `A "use server" file can only export async functions, found object.`
 */

import { generateJson } from '@/lib/ai/generate'
import type {
  QuestionDomain,
  ResearchQuestion,
  SearchHistoryItem,
  CoverageMap,
  QuestionResult,
  DiscoveryMode,
} from '@/lib/types/research-questions'
import type { NoveltySignal } from '@/lib/types/novelty-check'

// ── 메인 액션 ─────────────────────────────────────────────

export interface GenerateQuestionsOpts {
  /** 후속 라운드의 모드. 첫 라운드는 NULL 또는 생략. */
  mode?:                 DiscoveryMode | null
  /**
   * 같은 라운드 안에서 regenerate 시 이미 본 질문들의 영문 텍스트.
   * 프롬프트에 "do NOT repeat" 섹션으로 들어가 중복 회피.
   */
  alreadySeenQuestions?: string[]
  /**
   * 직전 트랙 시도에서 Novelty 검증 결과 회귀를 선택했을 때 전달되는 시그널.
   * 약한 차원/회피 가이드를 다음 질문 생성에 반영.
   */
  noveltySignal?:        NoveltySignal | null
}

export async function generateResearchQuestions(
  projectName:    string,
  researchIntent: string,
  history?:       SearchHistoryItem[],
  opts?:          GenerateQuestionsOpts,
): Promise<QuestionResult> {
  const isFollowUp = !!(history && history.length > 0)
  const mode       = isFollowUp ? (opts?.mode ?? 'broaden') : null

  // ── 히스토리 섹션 ────────────────────────────────────────
  const historySection = isFollowUp
    ? `\nSearch history so far (${history!.length} rounds):\n${history!
        .map((h, i) => {
          const insight = h.user_insight ? `\n  Researcher insight: "${h.user_insight}"` : ''
          const papers  = h.paperTitles.slice(0, 6).join(' | ')
          return `Round ${i + 1}: "${h.question}"\n  Papers found: ${papers || '(none)'}${insight}`
        })
        .join('\n')}\n`
    : ''

  const insightContext = isFollowUp
    ? (() => {
        const allInsights = history!.filter(h => h.user_insight).map(h => `"${h.user_insight}"`)
        return allInsights.length > 0
          ? `\nAccumulated researcher insights: ${allInsights.join('; ')}\n`
          : ''
      })()
    : ''

  // ── Regenerate 회피 섹션 ─────────────────────────────────
  const alreadySeenSection = (opts?.alreadySeenQuestions && opts.alreadySeenQuestions.length > 0)
    ? `\nALREADY GENERATED in this round (regenerate context — do NOT repeat or paraphrase):\n${
        opts.alreadySeenQuestions.map(q => `- "${q}"`).join('\n')
      }\n`
    : ''

  // ── Novelty 회귀 시그널 섹션 ─────────────────────────────
  const noveltySection = opts?.noveltySignal
    ? `\nPRIOR NOVELTY CHECK SIGNAL:
The user previously attempted to commit to topic "${opts.noveltySignal.attempted_title}"
but the verification found these dimensions overlapping with existing research: ${opts.noveltySignal.weak_dimensions.join(', ')}.
Guidance from verification: ${opts.noveltySignal.guidance}
→ Use this signal to steer this round's questions AWAY from the overlapping directions.
\n`
    : ''

  // ── 초회 vs 후속 분기 ────────────────────────────────────
  const taskDescription = isFollowUp
    ? buildFollowUpTask(mode!)
    : buildFirstRoundTask()

  const prompt = `You are a research literature strategist for interdisciplinary academic research.
Your job is to generate strategic search questions that build a comprehensive literature foundation.

Project: ${projectName}
Research Intent: ${researchIntent}
${historySection}${insightContext}${alreadySeenSection}${noveltySection}
${taskDescription}

Return a JSON object with exactly this structure:
{
  "questions": [
    {
      "question": "Full research question in English (complete sentence, 10-25 words)",
      "angle": "전략적 관점 (Korean, max 10 chars)",
      "focus": "이 질문이 탐색하는 인사이트 (Korean, 1 sentence)",
      "domain": "tech" | "application" | "intersection" | "methodology" | "frontier",
      "label": ${isFollowUp ? '"deepen" | "broaden" | "new_angle"' : 'null'},
      "coverage_note": "왜 지금 이 질문이 필요한가 (Korean, 1 sentence)"
    }
  ],
  "coverage_summary": "현재 탐색 커버리지 상태 요약 (Korean, 1 sentence — 후속 질문일 때만 의미 있음)"
}

Domain definitions:
- tech: Core technical methods or techniques relevant to the research intent. This may be AI/ML, statistical methods, computational simulation, experimental instrumentation, or domain-specific techniques — DERIVE FROM THE USER'S INTENT. Do NOT default to AI/ML unless the user's intent explicitly mentions it.
- application: The target field's existing methods, challenges, data types (in the field's own terms, without forcing AI framing)
- intersection: Current state of applying the core technique to the target field (only relevant if the technique exists outside the field)
- methodology: Benchmarks, datasets, evaluation metrics, experimental protocols
- frontier: Very recent work (last 1-2 years), emerging trends, unsolved problems

No markdown, pure JSON only.`

  try {
    const raw = await generateJson<{
      questions:        { question: string; angle: string; focus: string; domain: string; label?: string; coverage_note: string }[]
      coverage_summary: string
    }>(prompt, 0.4, { meta: { feature: 'research_questions' } })

    if (!Array.isArray(raw?.questions) || !raw.questions.length) {
      return { success: false, error: '질문 생성 실패. 다시 시도해 주세요.' }
    }

    const VALID_DOMAINS: QuestionDomain[] = ['tech', 'application', 'intersection', 'methodology', 'frontier']
    const VALID_LABELS:  DiscoveryMode[]   = ['deepen', 'broaden', 'new_angle']

    const questions: ResearchQuestion[] = raw.questions.slice(0, 5).map((q) => ({
      question:      q.question ?? '',
      angle:         q.angle    ?? '',
      focus:         q.focus    ?? '',
      domain:        VALID_DOMAINS.includes(q.domain as QuestionDomain)
                       ? (q.domain as QuestionDomain)
                       : 'tech',
      coverage_note: q.coverage_note ?? '',
      label:         isFollowUp && VALID_LABELS.includes(q.label as DiscoveryMode)
                       ? (q.label as DiscoveryMode)
                       : null,
    }))

    // 커버리지 맵 계산 (후속 질문일 때 포함)
    let coverage: CoverageMap | undefined
    if (isFollowUp && history!.length > 0) {
      coverage = buildCoverageMap(history!, questions, raw.coverage_summary ?? '')
    }

    return { success: true, data: questions, coverage }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return { success: false, error: 'API 요청 한도에 도달했습니다. 30초 후 다시 시도해 주세요.' }
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateResearchQuestions] 실패:', msg, err)
    return { success: false, error: msg }
  }
}

// ── 첫 질문 생성 지시 ─────────────────────────────────────

function buildFirstRoundTask(): string {
  return `TASK — First round: Generate 5 questions that systematically cover the full research landscape.

Distribute across domains as follows (one question per domain). FIRST infer what the "core technique" of this research is from the user's research intent — it could be AI/ML, statistics, instrumentation, computational simulation, a specific experimental method, or anything else. Do NOT assume AI/ML unless the intent explicitly mentions it.

1. [tech] What are the core technical methods most relevant to this research intent? (the techniques the researcher is likely to use or build upon — derived from the intent, not defaulted to AI)
2. [application] What are the current methods, challenges, and data characteristics of the target field? (the field's own paradigm)
3. [intersection] How is the core technique currently being applied to this specific target field? (skip the AI assumption — use whatever technique you identified in [tech])
4. [methodology] What datasets, benchmarks, or evaluation protocols exist for this problem?
5. [frontier] What are the most recent advances or unsolved challenges in the past 1-2 years?

Rules:
- Questions must be independent: each covers a clearly different angle
- Questions should yield 10–40 focused papers each
- Write questions in English (for search engines), max 25 words each
- Be specific to the exact research intent, not generic
- "label" field must be null for first round questions`
}

// ── 후속 질문 생성 지시 ───────────────────────────────────

function buildFollowUpTask(mode: DiscoveryMode): string {
  // 모드별 distribution. 합은 항상 5.
  const dist = mode === 'deepen'
    ? { deepen: 4, broaden: 1, new_angle: 0 }
    : mode === 'broaden'
    ? { deepen: 1, broaden: 4, new_angle: 0 }
    : { deepen: 0, broaden: 0, new_angle: 5 }

  const intentLine = mode === 'deepen'
    ? "Mode = DEEPEN. The researcher wants to NARROW DOWN — drill into already-explored areas with more specificity. Add only 1 broaden question as a safety net to avoid tunnel vision."
    : mode === 'broaden'
    ? "Mode = BROADEN. The researcher wants to explore ADJACENT areas not yet covered — related but different angles from prior rounds. Keep 1 deepen question as an anchor to prior trajectory."
    : "Mode = NEW_ANGLE. The researcher wants a CONSCIOUS DEPARTURE — entirely different perspectives not connected to the prior thinking. Do NOT mix in deepen/broaden questions; the user explicitly chose to step outside the current trajectory."

  return `TASK — Follow-up round (${mode} mode).

${intentLine}

Question distribution rules (MANDATORY — exact counts):
- "deepen"    questions: ${dist.deepen}
- "broaden"   questions: ${dist.broaden}
- "new_angle" questions: ${dist.new_angle}
Total = 5. Each question must carry the corresponding "label" field.

Label definitions:
- deepen    = drill down into a topic already explored (narrower sub-topic, more specific method/measurement/dataset)
- broaden   = explore an adjacent area not yet covered (related but different domain/angle from prior rounds)
- new_angle = an entirely different perspective not connected to prior trajectory (different paradigm, different sub-field, different research lens)

Hard rules:
- Do NOT repeat or paraphrase questions already asked in prior rounds
- If "ALREADY GENERATED in this round" section is present, do NOT repeat or paraphrase those either
- If "PRIOR NOVELTY CHECK SIGNAL" is present, steer questions AWAY from the listed overlapping dimensions

Quality rules per label:
- deepen: pick a previously-explored angle and go narrower — specific architecture, specific measurement, specific dataset/benchmark
- broaden: pick an adjacent angle the researcher likely hasn't tried — same general domain but different facet
- new_angle: cross to a different paradigm — different methodological tradition, different theoretical lens, or a completely different application context

Domain rule: distribute domain field naturally based on the question content (do NOT force one-per-domain like first round).`
}

// ── 커버리지 맵 계산 ──────────────────────────────────────

function buildCoverageMap(
  history:          SearchHistoryItem[],
  newQuestions:     ResearchQuestion[],
  summaryFromClaude: string,
): CoverageMap {
  // 히스토리 라운드 수로 대략적 추정
  const totalRounds = history.length
  const perDomain   = Math.floor(totalRounds / 5)
  const remainder   = totalRounds % 5

  // 새 질문에서 2회 이상 등장한 domain = thin area 추정
  const newDomainCount: Partial<Record<QuestionDomain, number>> = {}
  for (const q of newQuestions) {
    newDomainCount[q.domain] = (newDomainCount[q.domain] ?? 0) + 1
  }

  const thin_areas = (Object.entries(newDomainCount) as [QuestionDomain, number][])
    .filter(([, c]) => c >= 2)
    .map(([d]) => d)

  return {
    tech:         perDomain + (remainder > 0 ? 1 : 0),
    application:  perDomain + (remainder > 1 ? 1 : 0),
    intersection: perDomain + (remainder > 2 ? 1 : 0),
    methodology:  perDomain,
    frontier:     perDomain,
    thin_areas,
    summary: summaryFromClaude || `${totalRounds}회 탐색 완료 — 부족한 영역을 보완하는 질문을 생성했습니다.`,
  }
}
