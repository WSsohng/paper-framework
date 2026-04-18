/**
 * AI Context Builder — 프롬프트용 컨텍스트 섹션을 체인 방식으로 조립 (Phase 2A)
 *
 * 목적: 16개 AI 액션이 반복하던 "Supabase 쿼리 → slice → 텍스트 조립" 패턴을
 *       단일 빌더로 수렴. 섹션 순서·헤더·텍스트 한계를 중앙에서 관리.
 *
 * 사용 예:
 *   const { sections, meta } = await new AIContextBuilder({ projectId })
 *     .withResearchIntent()
 *     .withReferencePapers({ tierMin: 2, limit: 10 })
 *     .withAssets({ types: ['quote', 'note'], limit: 8 })
 *     .build()
 *
 * 주의: 이 파일은 `'use server'` 없이 내부 모듈로 동작한다.
 *       (클래스 export 가 'use server' 와 호환되지 않음)
 *       호출부는 서버 컨텍스트(server action / server component)여야 한다.
 */

import { createClient } from '@/lib/supabase/server'
import { estimatePromptTokens } from '@/lib/ai/pricing'
import type { AssetType, HypothesisStatus } from '@/lib/types'

// ── 공개 타입 ────────────────────────────────────────────

export type PromptLang = 'ko' | 'en'

export interface PromptSection {
  id:    string
  title: string
  body:  string
}

export interface ContextMeta {
  projectId?:            string
  trackId?:              string
  lang:                  PromptLang
  sectionCount:          number
  paperCount?:           number
  assetCount?:           number
  questionCount?:        number
  hypothesisCount?:      number
  estimatedInputTokens:  number
}

// ── 내부 타입 ────────────────────────────────────────────

type Pending =
  | { kind: 'intent' }
  | { kind: 'papers'; config: RefPapersConfig }
  | { kind: 'assets'; config: AssetsConfig }
  | { kind: 'questions'; config: QuestionsConfig }
  | { kind: 'hypotheses'; config: HypothesesConfig }
  | { kind: 'insights'; list: string[]; title?: string }
  | { kind: 'custom'; section: PromptSection }

export interface RefPapersConfig {
  /** 1=T1만, 2=T1·T2, 3=T1~T3, null=전체. default: 2 */
  tierMin?:          1 | 2 | 3 | null
  /** default: 10 */
  limit?:            number
  /** default: 2000 */
  abstractMaxChars?: number
  /** default: 'tier' */
  orderBy?:          'tier' | 'year_desc' | 'priority_score_desc'
}

export interface AssetsConfig {
  /** default: 모든 타입 */
  types?:           AssetType[]
  /** default: 8 */
  limit?:           number
  /** default: 300 */
  contentMaxChars?: number
}

export interface QuestionsConfig {
  /** default: 10 */
  limit?: number
}

export interface HypothesesConfig {
  /** default: 모든 상태 */
  status?: HypothesisStatus[]
  /** default: 10 */
  limit?:  number
}

// ── 섹션 고정 순서 ────────────────────────────────────────
// composePrompt 가 이 순서대로 배치한다.

const SECTION_ORDER = [
  'research_intent',
  'reference_papers',
  'assets',
  'discovery_questions',
  'hypotheses',
  'user_insights',
] as const

// 커스텀 섹션은 위 고정 섹션 뒤에 삽입된 순서대로 배치.

// ── 제목 다국어 ──────────────────────────────────────────

const TITLES: Record<string, { ko: string; en: string }> = {
  research_intent:     { ko: '연구 의도',           en: 'Research Intent' },
  reference_papers:    { ko: '참고문헌',             en: 'Reference Papers' },
  assets:              { ko: '연구 자산',            en: 'Research Assets' },
  discovery_questions: { ko: '연구 탐색 질문',       en: 'Exploration Questions' },
  hypotheses:          { ko: '기존 가설',            en: 'Prior Hypotheses' },
  user_insights:       { ko: '연구자 인사이트',      en: 'Researcher Insights' },
}

// ── 빌더 본체 ────────────────────────────────────────────

export async function buildContext(opts: {
  projectId?: string
  trackId?:   string
  lang?:      PromptLang
  pending:    Pending[]
}): Promise<{ sections: PromptSection[]; meta: ContextMeta }> {
  const lang = opts.lang ?? 'ko'
  const supabase = await createClient()

  // kind → 섹션 계산 (빈 결과면 null)
  const raw: Array<PromptSection | null> = []
  const counters: {
    paperCount?: number
    assetCount?: number
    questionCount?: number
    hypothesisCount?: number
  } = {}

  for (const p of opts.pending) {
    switch (p.kind) {
      case 'intent': {
        if (!opts.projectId) { raw.push(null); break }
        const { data } = await supabase
          .from('projects')
          .select('research_intent')
          .eq('id', opts.projectId)
          .maybeSingle()
        const body = (data?.research_intent ?? '').trim()
        raw.push(
          body
            ? { id: 'research_intent', title: TITLES.research_intent[lang], body }
            : null,
        )
        break
      }

      case 'papers': {
        if (!opts.projectId) { raw.push(null); break }
        const { tierMin = 2, limit = 10, abstractMaxChars = 2000, orderBy = 'tier' } = p.config
        let q = supabase
          .from('reference_papers')
          .select('title, journal, year, abstract, tier')
          .eq('project_id', opts.projectId)
          .not('abstract', 'is', null)
          .limit(limit)
        if (tierMin != null) q = q.lte('tier', tierMin)
        if (orderBy === 'year_desc') {
          q = q.order('year', { ascending: false, nullsFirst: false })
        } else if (orderBy === 'priority_score_desc') {
          q = q.order('priority_score', { ascending: false, nullsFirst: false })
        } else {
          q = q.order('tier', { ascending: true, nullsFirst: false })
        }

        const { data } = await q
        const papers = data ?? []
        counters.paperCount = papers.length
        if (!papers.length) { raw.push(null); break }

        const body = papers
          .map((r) => {
            const tierLabel = r.tier ? `T${r.tier}` : '?'
            const abs = (r.abstract ?? '').slice(0, abstractMaxChars)
            return `[${tierLabel}] ${r.title}${r.year ? ` (${r.year})` : ''}${r.journal ? ` — ${r.journal}` : ''}\n${abs}`
          })
          .join('\n\n')
        raw.push({ id: 'reference_papers', title: TITLES.reference_papers[lang], body })
        break
      }

      case 'assets': {
        if (!opts.projectId) { raw.push(null); break }
        const { types, limit = 8, contentMaxChars = 300 } = p.config
        let q = supabase
          .from('assets')
          .select('title, content, type')
          .eq('project_id', opts.projectId)
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (types && types.length) q = q.in('type', types)

        const { data } = await q
        const assets = data ?? []
        counters.assetCount = (counters.assetCount ?? 0) + assets.length
        if (!assets.length) { raw.push(null); break }

        const body = assets
          .map((a) => `[${a.type}] ${a.title}: ${(a.content ?? '').slice(0, contentMaxChars)}`)
          .join('\n')
        raw.push({ id: 'assets', title: TITLES.assets[lang], body })
        break
      }

      case 'questions': {
        if (!opts.projectId) { raw.push(null); break }
        const { limit = 10 } = p.config
        const { data } = await supabase
          .from('discovery_rounds')
          .select('question')
          .eq('project_id', opts.projectId)
          .order('created_at', { ascending: false })
          .limit(limit)

        const rounds = data ?? []
        counters.questionCount = rounds.length
        if (!rounds.length) { raw.push(null); break }

        const body = rounds.map((r, i) => `${i + 1}. ${r.question}`).join('\n')
        raw.push({ id: 'discovery_questions', title: TITLES.discovery_questions[lang], body })
        break
      }

      case 'hypotheses': {
        if (!opts.projectId) { raw.push(null); break }
        const { status, limit = 10 } = p.config
        let q = supabase
          .from('hypotheses')
          .select('title, statement, methodology, status')
          .eq('project_id', opts.projectId)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (status && status.length) q = q.in('status', status)

        const { data } = await q
        const hyps = data ?? []
        counters.hypothesisCount = hyps.length
        if (!hyps.length) { raw.push(null); break }

        const body = hyps
          .map((h) => `• [${h.status}] ${h.title}: ${h.statement}`)
          .join('\n')
        raw.push({ id: 'hypotheses', title: TITLES.hypotheses[lang], body })
        break
      }

      case 'insights': {
        const list = (p.list ?? []).map((s) => s.trim()).filter(Boolean)
        if (!list.length) { raw.push(null); break }
        const body = list.map((ins, i) => `${i + 1}. ${ins}`).join('\n')
        const title = p.title ?? TITLES.user_insights[lang]
        raw.push({ id: 'user_insights', title, body })
        break
      }

      case 'custom': {
        raw.push(p.section)
        break
      }
    }
  }

  // 정렬: SECTION_ORDER 먼저, 그 다음 custom 순서
  const fixed: PromptSection[] = []
  for (const id of SECTION_ORDER) {
    const s = raw.find((r): r is PromptSection => !!r && r.id === id)
    if (s) fixed.push(s)
  }
  const customs = raw.filter(
    (r): r is PromptSection =>
      !!r && !(SECTION_ORDER as readonly string[]).includes(r.id),
  )
  const sections = [...fixed, ...customs]

  // 토큰 추정 (섹션 본문만 합산, 실제 프롬프트에는 role/objective 등 추가됨)
  const joinedBody = sections.map((s) => `[${s.title}]\n${s.body}`).join('\n\n')
  const estimatedInputTokens = estimatePromptTokens(joinedBody)

  return {
    sections,
    meta: {
      projectId:   opts.projectId,
      trackId:     opts.trackId,
      lang,
      sectionCount: sections.length,
      ...counters,
      estimatedInputTokens,
    },
  }
}

/**
 * 체인 API 형태. 인스턴스 메서드는 "등록"만 하고 `build()` 에서 일괄 실행.
 *
 * 왜 함수가 아니라 클래스?
 *   - 체인 형태가 호출부 가독성을 높임
 *   - 'use server' 하에서도 클래스 메서드(모두 sync)는 export 안 하면 문제없음
 */
export class AIContextBuilder {
  private pending: Pending[] = []
  private readonly projectId?: string
  private readonly trackId?:   string
  private readonly lang:       PromptLang

  constructor(opts: { projectId?: string; trackId?: string; lang?: PromptLang } = {}) {
    this.projectId = opts.projectId
    this.trackId   = opts.trackId
    this.lang      = opts.lang ?? 'ko'
  }

  withResearchIntent(): this {
    this.pending.push({ kind: 'intent' })
    return this
  }

  withReferencePapers(config: RefPapersConfig = {}): this {
    this.pending.push({ kind: 'papers', config })
    return this
  }

  withAssets(config: AssetsConfig = {}): this {
    this.pending.push({ kind: 'assets', config })
    return this
  }

  withDiscoveryQuestions(config: QuestionsConfig = {}): this {
    this.pending.push({ kind: 'questions', config })
    return this
  }

  withHypotheses(config: HypothesesConfig = {}): this {
    this.pending.push({ kind: 'hypotheses', config })
    return this
  }

  withUserInsights(list: string[], title?: string): this {
    this.pending.push({ kind: 'insights', list, title })
    return this
  }

  /** 자유 섹션. 고정 섹션 뒤에 등록 순서대로 배치됨. */
  withCustom(section: PromptSection): this {
    this.pending.push({ kind: 'custom', section })
    return this
  }

  async build(): Promise<{ sections: PromptSection[]; meta: ContextMeta }> {
    return buildContext({
      projectId: this.projectId,
      trackId:   this.trackId,
      lang:      this.lang,
      pending:   this.pending,
    })
  }
}
