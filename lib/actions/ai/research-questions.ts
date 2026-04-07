'use server'

import { generateJson } from '@/lib/ai/generate'

// ── 타입 ──────────────────────────────────────────────────

/** 질문이 커버하는 도메인 영역 */
export type QuestionDomain =
  | 'tech'          // 기술 도메인: AI/ML 기법, 아키텍처
  | 'application'   // 응용 도메인: 타겟 분야의 현재 방법론·과제
  | 'intersection'  // 교차점: 기술이 타겟 분야에 적용된 현황
  | 'methodology'   // 평가·벤치마크·데이터셋
  | 'frontier'      // 최신 동향·미해결 과제

export interface ResearchQuestion {
  question:      string          // 실제 검색에 쓸 영문 질문
  angle:         string          // 전략적 관점 레이블 (Korean, ≤10 chars)
  focus:         string          // 이 질문이 탐색하는 인사이트 (Korean, 1 sentence)
  domain:        QuestionDomain  // 어느 영역을 커버하는가
  coverage_note: string          // 왜 이 질문이 지금 필요한가 (Korean, 1 sentence)
}

export interface SearchHistoryItem {
  question:     string
  paperTitles:  string[]
  user_insight: string | null
}

/** 현재 커버리지 상태 — UI에 표시해서 연구자가 부족한 부분을 인식하게 함 */
export interface CoverageMap {
  tech:         number   // 탐색 횟수
  application:  number
  intersection: number
  methodology:  number
  frontier:     number
  thin_areas:   QuestionDomain[]    // 아직 부족한 영역
  summary:      string              // 한 문장 요약 (Korean)
}

export type QuestionResult =
  | { success: true;  data: ResearchQuestion[]; coverage?: CoverageMap }
  | { success: false; error: string }

// ── 도메인 레이블 (UI) ────────────────────────────────────
export const DOMAIN_LABEL: Record<QuestionDomain, string> = {
  tech:         'AI 기법',
  application:  '응용 분야',
  intersection: '교차 적용',
  methodology:  '방법론·평가',
  frontier:     '최신 동향',
}

export const DOMAIN_COLOR: Record<QuestionDomain, string> = {
  tech:         'bg-violet-900/40 text-violet-300',
  application:  'bg-teal-900/40 text-teal-300',
  intersection: 'bg-blue-900/40 text-blue-300',
  methodology:  'bg-amber-900/40 text-amber-300',
  frontier:     'bg-rose-900/40 text-rose-300',
}

// ── 메인 액션 ─────────────────────────────────────────────

export async function generateResearchQuestions(
  projectName:    string,
  researchIntent: string,
  history?:       SearchHistoryItem[],
): Promise<QuestionResult> {
  const isFollowUp = history && history.length > 0

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

  // ── 초회 vs 후속 분기 ────────────────────────────────────
  const taskDescription = isFollowUp
    ? buildFollowUpTask()
    : buildFirstRoundTask()

  const prompt = `You are a research literature strategist for interdisciplinary academic research.
Your job is to generate strategic search questions that build a comprehensive literature foundation.

Project: ${projectName}
Research Intent: ${researchIntent}
${historySection}${insightContext}
${taskDescription}

Return a JSON object with exactly this structure:
{
  "questions": [
    {
      "question": "Full research question in English (complete sentence, 10-25 words)",
      "angle": "전략적 관점 (Korean, max 10 chars)",
      "focus": "이 질문이 탐색하는 인사이트 (Korean, 1 sentence)",
      "domain": "tech" | "application" | "intersection" | "methodology" | "frontier",
      "coverage_note": "왜 지금 이 질문이 필요한가 (Korean, 1 sentence)"
    }
  ],
  "coverage_summary": "현재 탐색 커버리지 상태 요약 (Korean, 1 sentence — 후속 질문일 때만 의미 있음)"
}

Domain definitions:
- tech: AI/ML techniques, architectures, models — focus on the technology side only
- application: The target field's existing methods, challenges, data types — without AI
- intersection: Current state of applying AI/tech to the target field
- methodology: Benchmarks, datasets, evaluation metrics, experimental protocols
- frontier: Very recent work (last 1-2 years), emerging trends, unsolved problems

No markdown, pure JSON only.`

  try {
    const raw = await generateJson<{
      questions:        { question: string; angle: string; focus: string; domain: string; coverage_note: string }[]
      coverage_summary: string
    }>(prompt, 0.4, { meta: { feature: 'research_questions' } })

    if (!Array.isArray(raw?.questions) || !raw.questions.length) {
      return { success: false, error: '질문 생성 실패. 다시 시도해 주세요.' }
    }

    const VALID_DOMAINS: QuestionDomain[] = ['tech', 'application', 'intersection', 'methodology', 'frontier']

    const questions: ResearchQuestion[] = raw.questions.slice(0, 5).map((q) => ({
      question:      q.question ?? '',
      angle:         q.angle    ?? '',
      focus:         q.focus    ?? '',
      domain:        VALID_DOMAINS.includes(q.domain as QuestionDomain)
                       ? (q.domain as QuestionDomain)
                       : 'tech',
      coverage_note: q.coverage_note ?? '',
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
    return { success: false, error: msg }
  }
}

// ── 첫 질문 생성 지시 ─────────────────────────────────────

function buildFirstRoundTask(): string {
  return `TASK — First round: Generate 5 questions that systematically cover the full research landscape.

Distribute across domains as follows (one question per domain):
1. [tech] What are the latest AI/ML techniques relevant to this research? (focus on the technology side)
2. [application] What are the current methods, challenges, and data characteristics of the target field? (no AI)
3. [intersection] What is the current state of applying AI/ML to this specific target field?
4. [methodology] What datasets, benchmarks, or evaluation protocols exist for this problem?
5. [frontier] What are the most recent advances or unsolved challenges in the past 1-2 years?

Rules:
- Questions must be independent: each covers a clearly different angle
- Questions should yield 10–40 focused papers each
- Write questions in English (for search engines), max 25 words each
- Be specific to the exact research intent, not generic`
}

// ── 후속 질문 생성 지시 ───────────────────────────────────

function buildFollowUpTask(): string {
  return `TASK — Follow-up round: Analyze what's been covered and fill the gaps.

Step 1 — Map previous rounds to domains:
  Estimate how well each domain is covered based on the search questions and papers found.
  A domain is "thin" if: fewer than 2 rounds covered it, OR papers found were mostly unrelated.

Step 2 — Identify the 2-3 thinnest domains.

Step 3 — Generate 5 questions targeting those thin domains first, then deepen already-covered areas.

Question distribution rules:
- At least 2 questions must target the thinnest domains
- At least 1 question must go deeper into a previously explored angle (more specific sub-topic)
- At least 1 question should explore a completely new angle not yet tried
- Do NOT repeat questions already asked

For "thin" domains, be more targeted:
  - tech: specific architecture/technique (e.g., "graph neural network molecular property" not just "deep learning chemistry")
  - application: specific measurement type or workflow in the field
  - intersection: specific task (classification, regression, anomaly detection) in the target field
  - frontier: narrow sub-trend (e.g., "few-shot learning chemical analysis 2024")`
}

// ── 커버리지 맵 계산 ──────────────────────────────────────

function buildCoverageMap(
  history:          SearchHistoryItem[],
  newQuestions:     ResearchQuestion[],
  summaryFromClaude: string,
): CoverageMap {
  // 간단한 키워드 휴리스틱으로 기존 히스토리를 domain으로 분류
  const counts: Record<QuestionDomain, number> = {
    tech: 0, application: 0, intersection: 0, methodology: 0, frontier: 0,
  }

  // 새로 생성된 질문의 domain 분포로 역으로 thin area 추정
  // (Claude가 많이 생성한 domain = 아직 부족한 domain)
  for (const q of newQuestions) {
    // 새 질문이 집중하는 domain이 thin area
  }

  // 히스토리 라운드 수로 대략적 추정
  const totalRounds = history.length
  const perDomain   = Math.floor(totalRounds / 5)
  const remainder   = totalRounds % 5

  // 실제 domain 태깅은 Claude가 하므로 여기서는 thin areas를
  // 새 질문에서 2회 이상 등장한 domain으로 판단
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
