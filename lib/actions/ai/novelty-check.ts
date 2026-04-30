'use server'

/**
 * Novelty 검증 — 트랙 생성 직전 게이트.
 *
 * 사용자가 "🔍 Novelty 검증" 버튼을 명시적으로 누르면 호출된다 (옵션).
 *
 * 3-step 하이브리드:
 *   STEP 1) AI 사전 5차원 분석 + 외부 검증이 가장 필요한 차원 2-3개에 대한 검색 쿼리 생성
 *   STEP 2) Semantic Scholar 로 그 쿼리들 검색 (직렬, rate-limit 안전)
 *   STEP 3) AI 종합 — 검색 evidence 기반으로 5차원 verdict 확정 + 유사 논문 정리
 *
 * 결정은 사용자가 함 — 시스템은 차별점/겹침의 증거만 제공.
 */

import { generateJson } from '@/lib/ai/generate'
import { AIContextBuilder } from '@/lib/ai/context-builder'
import { composePrompt } from '@/lib/ai/prompt-composer'
import { searchPapers } from '@/lib/actions/search/search-papers'
import type { FoundPaper } from '@/lib/actions/search/semantic-scholar'
import type {
  NoveltyCheckResult,
  NoveltyDimension,
  DimensionAnalysis,
  SimilarPaper,
  DifferentiationOpportunity,
} from '@/lib/types/novelty-check'

/** Novelty 검증 풀 컨텍스트 — 메타데이터 포함 (B2 v21). */
export interface NoveltyPoolPaper {
  title:     string
  abstract?: string | null
  concepts?: string[]
  year?:     number | null
  journal?:  string | null
  /** 0~1 — 프로젝트 의도 대비 관련도 (reference_papers 가 있으면 활용). */
  relevance_score?: number | null
}

export interface NoveltyCheckInput {
  /** 검증 대상 주제 */
  topic: { title: string; gap: string; angle: string }
  /** 누적 컨텍스트 — Research Intent */
  researchIntent: string
  /** 사용자가 거쳐온 연구 질문들 (사고 궤적) */
  researchQuestions: string[]
  /** 사용자 인사이트들 */
  userInsights: string[]
  /**
   * 풀 메타 (B2 v21) — abstract·concepts 포함.
   * 있으면 poolPaperTitles 보다 우선 사용. 상위 20편까지 컨텍스트에 포함.
   */
  poolPapers?: NoveltyPoolPaper[]
  /** 레거시 — poolPapers 가 없을 때 fallback. 제목만 30편. */
  poolPaperTitles?: string[]
}

export type NoveltyResult =
  | { success: true;  data: NoveltyCheckResult }
  | { success: false; error: string }

const VALID_DIMS: NoveltyDimension[] = ['topic', 'methodology', 'intersection', 'perspective', 'extension']
const VALID_VERDICTS: DimensionAnalysis['verdict'][] = ['novel', 'partial', 'overlap']

interface Stage1Output {
  preliminary_dimensions: Partial<Record<NoveltyDimension, { verdict?: string; rationale?: string }>>
  verification_queries:   { dimension?: string; query?: string }[]
}

interface EvidenceItem {
  dimension:  NoveltyDimension
  title:      string
  year:       number | null
  authors:    string[]
  abstract:   string
  journal:    string | null
  semanticId: string
}

interface Stage2Output {
  dimensions:     Partial<Record<NoveltyDimension, { verdict?: string; rationale?: string; risk?: string }>>
  similar_papers: { evidence_index?: number; dimension?: string; similarity_note?: string }[]
  summary:        string
  /** v21 (B3-검증) — 차별성 기회 3-5개. JSON 파싱 실패 시 undefined. */
  differentiation_opportunities?: {
    dimension?:      string
    type?:           string
    recommendation?: string
    example?:        string
  }[]
}

export async function checkNovelty(
  input: NoveltyCheckInput,
): Promise<NoveltyResult> {
  // ── STEP 1: 사전 5차원 분석 + 검증 쿼리 생성 ──────────────
  const stage1Builder = new AIContextBuilder({ lang: 'en' })
    .withCustom({
      id:    'topic',
      title: 'Candidate Research Topic',
      body:  `Title: ${input.topic.title}\nAngle: ${input.topic.angle}\nGap addressed: ${input.topic.gap}`,
    })
    .withCustom({
      id:    'project',
      title: 'Research Context',
      body:  `Intent: ${input.researchIntent}`,
    })

  if (input.researchQuestions.length) {
    stage1Builder.withUserInsights(
      input.researchQuestions,
      'Research Questions Explored So Far (researcher\'s thought trajectory)',
    )
  }
  if (input.userInsights.length) {
    stage1Builder.withUserInsights(
      input.userInsights,
      'Researcher Insights',
    )
  }
  // B2 v21: 메타데이터 포함 풀이 우선
  if (input.poolPapers && input.poolPapers.length > 0) {
    const top = input.poolPapers.slice(0, 20)
    const body = top.map((p, i) => {
      const meta = [
        p.year    ? `${p.year}`              : null,
        p.journal ? p.journal                : null,
        p.concepts && p.concepts.length > 0 ? `concepts: [${p.concepts.slice(0, 6).join(', ')}]` : null,
      ].filter(Boolean).join(' · ')
      const head = `[${i + 1}] "${p.title}"${meta ? ` — ${meta}` : ''}`
      const abs  = p.abstract ? `\n     ${p.abstract.slice(0, 250)}` : ''
      return head + abs
    }).join('\n\n')

    stage1Builder.withCustom({
      id:    'pool',
      title: `Already-Reviewed Papers in Pool (${input.poolPapers.length} total, top ${top.length} with metadata)`,
      body,
    })
  } else if (input.poolPaperTitles && input.poolPaperTitles.length) {
    stage1Builder.withCustom({
      id:    'pool',
      title: `Already-Reviewed Papers (sample of ${input.poolPaperTitles.length})`,
      body:  input.poolPaperTitles.slice(0, 30).map((t, i) => `${i + 1}. ${t}`).join('\n'),
    })
  }

  const { sections: stage1Sections } = await stage1Builder.build()

  const stage1Prompt = composePrompt(
    {
      lang:      'en',
      role:      'You are a research novelty analyst.',
      objective: 'Produce a preliminary 5-dimension novelty analysis AND propose external search queries for the 2 highest-risk dimensions.',
      reasoning: [
        'For EACH of 5 dimensions (topic / methodology / intersection / perspective / extension), draft a preliminary verdict (novel|partial|overlap) and 1-2 sentence rationale based on the provided context.',
        'Identify the 2 dimensions that carry the HIGHEST RISK of overlap — those that need external evidence to confirm.',
        'For each of those 2 dimensions, write a focused English search query (max 12 words) that would surface the most directly comparable existing literature.',
      ],
      output: {
        kind:  'object',
        shape: `{
  "preliminary_dimensions": {
    "topic":        { "verdict": "novel|partial|overlap", "rationale": "1-2 sentences" },
    "methodology":  { "verdict": "novel|partial|overlap", "rationale": "1-2 sentences" },
    "intersection": { "verdict": "novel|partial|overlap", "rationale": "1-2 sentences" },
    "perspective":  { "verdict": "novel|partial|overlap", "rationale": "1-2 sentences" },
    "extension":    { "verdict": "novel|partial|overlap", "rationale": "1-2 sentences" }
  },
  "verification_queries": [
    { "dimension": "<dim>", "query": "<English search query>" },
    { "dimension": "<dim>", "query": "<English search query>" }
  ]
}`,
      },
    },
    { sections: stage1Sections },
  )

  let stage1: Stage1Output
  try {
    stage1 = await generateJson<Stage1Output>(stage1Prompt, 0.3, {
      meta: { feature: 'novelty_check' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `1단계 분석 실패: ${msg}` }
  }

  // ── STEP 2: 외부 검색 (직렬) ───────────────────────────────
  const queries = (stage1.verification_queries ?? [])
    .filter((q) => q?.query && q?.dimension && VALID_DIMS.includes(q.dimension as NoveltyDimension))
    .slice(0, 3)

  const evidence: EvidenceItem[] = []
  for (const q of queries) {
    const result = await searchPapers(q.query!, { limit: 8 })
    if (!result.success) continue
    for (const p of result.data.slice(0, 5)) {
      evidence.push({
        dimension:  q.dimension as NoveltyDimension,
        title:      p.title,
        year:       p.year,
        authors:    p.authors.slice(0, 3),
        abstract:   (p.abstract ?? '').slice(0, 300),
        journal:    p.journal,
        semanticId: p.semanticId,
      })
    }
  }

  // 검색 evidence 가 0건이면 STEP 1 결과만 사용
  if (evidence.length === 0) {
    return {
      success: true,
      data: buildResult(
        input.topic,
        stage1.preliminary_dimensions ?? {},
        [],
        '외부 검색 결과를 찾지 못해 AI 사전 분석만 반영했습니다. 차별점 판단은 사용자 검토를 권장합니다.',
      ),
    }
  }

  // ── STEP 3: AI 종합 — evidence 보고 verdict 확정 ──────────
  const stage2Builder = new AIContextBuilder({ lang: 'en' })
    .withCustom({
      id:    'topic',
      title: 'Candidate Research Topic',
      body:  `Title: ${input.topic.title}\nAngle: ${input.topic.angle}\nGap: ${input.topic.gap}`,
    })
    .withCustom({
      id:    'preliminary',
      title: 'Preliminary 5-Dimension Analysis (from Stage 1)',
      body:  JSON.stringify(stage1.preliminary_dimensions ?? {}, null, 2),
    })
    .withCustom({
      id:    'evidence',
      title: `External Search Evidence (Semantic Scholar — ${evidence.length} papers)`,
      body:  evidence.map((e, i) =>
        `[${i + 1}] (target dim: ${e.dimension}) "${e.title}" — ${e.authors.join(', ')} (${e.year ?? '?'}) — ${e.journal ?? 'no journal'}\n   ${e.abstract}`
      ).join('\n\n'),
    })

  const { sections: stage2Sections } = await stage2Builder.build()

  const stage2Prompt = composePrompt(
    {
      lang:      'en',
      role:      'You are a research novelty analyst finalizing a verification.',
      objective: 'Produce the FINAL 5-dimension verdict using external evidence, plus a list of genuinely similar papers with Korean similarity notes.',
      reasoning: [
        'For each of the 5 dimensions: re-evaluate using evidence. If evidence shows overlap, downgrade to "partial" or "overlap"; if evidence supports defensibility, keep or upgrade.',
        'For each evidence paper, decide: is it GENUINELY SIMILAR to the candidate topic (and on which dimension), or unrelated? Discard unrelated ones.',
        'For genuinely similar papers, write a 1-sentence Korean similarity_note explaining the overlap.',
        'Write a 2-3 sentence Korean summary of the overall novelty position — this is shown prominently in UI.',
        'STEP 4 — DIFFERENTIATION OPPORTUNITIES: Based on similar papers, propose 3-5 concrete ways the candidate topic could differentiate. PREFER methodology / extension / intersection dimensions. If genuinely-similar evidence count ≥ 3, include "quantitative" type opportunities (concrete metrics, dataset sizes, experimental conditions) with examples; if evidence < 3, restrict to "directional" type only (broader strategic angles). Each opportunity gets dimension + type + Korean recommendation (1-2 sentences) + optional Korean example (1 sentence, concrete).',
      ],
      output: {
        kind:  'object',
        shape: `{
  "dimensions": {
    "topic":        { "verdict": "novel|partial|overlap", "rationale": "Korean 1-2 sentences", "risk": "Korean 1 sentence (optional, only if there is real risk)" },
    "methodology":  { "verdict": "...", "rationale": "...", "risk": "..." },
    "intersection": { "verdict": "...", "rationale": "...", "risk": "..." },
    "perspective":  { "verdict": "...", "rationale": "...", "risk": "..." },
    "extension":    { "verdict": "...", "rationale": "...", "risk": "..." }
  },
  "similar_papers": [
    {
      "evidence_index": 1,
      "dimension":       "<one of 5 dims>",
      "similarity_note": "Korean 1 sentence why this is genuinely similar"
    }
  ],
  "summary": "Korean 2-3 sentences overall novelty assessment",
  "differentiation_opportunities": [
    {
      "dimension":      "methodology|extension|intersection|topic|perspective",
      "type":           "quantitative|methodological|directional",
      "recommendation": "Korean 1-2 sentences",
      "example":        "Korean 1 sentence concrete example (optional)"
    }
  ]
}`,
      },
    },
    { sections: stage2Sections },
  )

  let stage2: Stage2Output
  try {
    stage2 = await generateJson<Stage2Output>(stage2Prompt, 0.3, {
      meta: { feature: 'novelty_check' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `2단계 분석 실패: ${msg}` }
  }

  // similar_papers 매핑 (evidence_index → 실제 논문)
  const similarPapers: SimilarPaper[] = (stage2.similar_papers ?? [])
    .map((sp): SimilarPaper | null => {
      const idx = (sp.evidence_index ?? 0) - 1
      const e   = evidence[idx]
      if (!e) return null
      const dim = VALID_DIMS.includes(sp.dimension as NoveltyDimension)
        ? (sp.dimension as NoveltyDimension)
        : e.dimension
      return {
        title:           e.title,
        authors:         e.authors,
        year:            e.year,
        journal:         e.journal,
        paper_id:        e.semanticId,
        dimension:       dim,
        similarity_note: sp.similarity_note ?? '',
      }
    })
    .filter((x): x is SimilarPaper => x !== null)
    .slice(0, 5)

  // v21 (B3-검증): differentiation_opportunities 매핑
  const VALID_TYPES: DifferentiationOpportunity['type'][] = ['quantitative', 'methodological', 'directional']
  const opportunities: DifferentiationOpportunity[] = (stage2.differentiation_opportunities ?? [])
    .map((op): DifferentiationOpportunity | null => {
      const dim = VALID_DIMS.includes(op.dimension as NoveltyDimension)
        ? (op.dimension as NoveltyDimension)
        : null
      const type = VALID_TYPES.includes(op.type as DifferentiationOpportunity['type'])
        ? (op.type as DifferentiationOpportunity['type'])
        : null
      if (!dim || !type || !op.recommendation) return null
      return {
        dimension:      dim,
        type,
        recommendation: op.recommendation,
        ...(op.example ? { example: op.example } : {}),
      }
    })
    .filter((x): x is DifferentiationOpportunity => x !== null)
    .slice(0, 5)

  return {
    success: true,
    data: buildResult(
      input.topic,
      stage2.dimensions ?? {},
      similarPapers,
      stage2.summary ?? '',
      opportunities,
    ),
  }
}

// ── 결과 노멀라이즈 ───────────────────────────────────────

function buildResult(
  topic:         NoveltyCheckResult['target'],
  dimensions:    Partial<Record<NoveltyDimension, { verdict?: string; rationale?: string; risk?: string }>>,
  similar:       SimilarPaper[],
  summary:       string,
  opportunities: DifferentiationOpportunity[] = [],
): NoveltyCheckResult {
  const norm = (d: { verdict?: string; rationale?: string; risk?: string } | undefined): DimensionAnalysis => {
    const verdict = (d?.verdict && VALID_VERDICTS.includes(d.verdict as DimensionAnalysis['verdict']))
      ? (d.verdict as DimensionAnalysis['verdict'])
      : 'partial'
    return {
      verdict,
      rationale: d?.rationale ?? '',
      ...(d?.risk ? { risk: d.risk } : {}),
    }
  }

  return {
    target: topic,
    dimensions: {
      topic:        norm(dimensions.topic),
      methodology:  norm(dimensions.methodology),
      intersection: norm(dimensions.intersection),
      perspective:  norm(dimensions.perspective),
      extension:    norm(dimensions.extension),
    },
    similar_papers: similar,
    ...(opportunities.length > 0 ? { differentiation_opportunities: opportunities } : {}),
    summary,
    checked_at: new Date().toISOString(),
  }
}
