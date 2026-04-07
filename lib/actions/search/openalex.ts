'use server'

/**
 * OpenAlex API — Semantic Scholar 키 미승인 기간 임시 대체 provider
 * - 무료, 키 불필요, 초당 10 요청 (polite pool)
 * - https://docs.openalex.org/
 */

import type { FoundPaper, PaperSearchResult, SearchOptions } from './semantic-scholar'

const OA_BASE   = 'https://api.openalex.org/works'
// polite pool: User-Agent에 이메일 포함 → rate limit 완화
const OA_EMAIL  = 'paperfactory-app@noreply.dev'

export async function searchPapersOpenAlex(
  keyword: string,
  limitOrOpts: number | SearchOptions = 15,
): Promise<PaperSearchResult> {
  const opts: SearchOptions =
    typeof limitOrOpts === 'number' ? { limit: limitOrOpts } : limitOrOpts

  // 최대 40편: 변형 쿼리 병렬 검색으로 풀이 충분히 확보됨
  const limit    = Math.min(opts.limit ?? 15, 50)
  const yearFrom = opts.yearFrom ?? null

  const filters: string[] = []
  if (yearFrom) {
    filters.push(`from_publication_date:${yearFrom}-01-01`)
  }

  const params = new URLSearchParams({
    search:     keyword,
    // per-page: limit * 3 (최대 80) — 더 넓은 후보 풀 확보 후 클라이언트 재정렬
    'per-page': String(Math.min(limit * 3, 80)),
    select:     'id,display_name,authorships,publication_year,abstract_inverted_index,primary_location,cited_by_count,open_access,type,doi',
  })

  // sort 미설정: search 파라미터 존재 시 OpenAlex가 자동으로 relevance_score:desc 적용
  // 이전에 cited_by_count:desc를 사용했으나 고인용 논문 편향으로 관련성 낮은 결과 반환됨

  if (filters.length) {
    params.set('filter', filters.join(','))
  }

  try {
    const res = await fetch(`${OA_BASE}?${params}`, {
      headers: {
        'User-Agent': `PaperFactory/1.0 (mailto:${OA_EMAIL})`,
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After')
        const retryAfterSecs = retryAfter ? Math.ceil(parseFloat(retryAfter)) : 30
        return { success: false, error: 'RATE_LIMIT', retryAfterSecs }
      }
      const body = await res.text().catch(() => '')
      return { success: false, error: `OpenAlex 오류: HTTP ${res.status} — ${body.slice(0, 200)}` }
    }

    const json = await res.json() as { results: OAWork[]; meta: { count: number } }
    let papers: FoundPaper[] = (json.results ?? []).map(mapOAPaper)

    // 연도 필터 (API 필터가 적용 안 된 경우 보완)
    if (yearFrom) {
      papers = papers.filter(p => p.year == null || p.year >= yearFrom)
    }

    // OpenAlex relevance 순서를 기본 유지하되,
    // abstract 있는 논문을 앞으로, 없는 논문을 뒤로 이동
    // (Claude 판단 정확도를 높이기 위해)
    papers.sort((a, b) => {
      const aHasAbstract = a.abstract ? 1 : 0
      const bHasAbstract = b.abstract ? 1 : 0
      return bHasAbstract - aHasAbstract
      // 동일 abstract 유무일 때는 OpenAlex 원래 순서(relevance) 유지
    })

    papers = papers.slice(0, limit)

    return { success: true, data: papers, total: json.meta?.count ?? papers.length }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `OpenAlex 검색 실패: ${msg}` }
  }
}

// ── OpenAlex 타입 정의 ─────────────────────────────────────

interface OAWork {
  id:                       string
  display_name:             string | null
  authorships:              { author: { display_name: string } }[]
  publication_year:         number | null
  abstract_inverted_index:  Record<string, number[]> | null
  primary_location:         { source?: { display_name?: string } } | null
  cited_by_count:           number
  open_access:              { oa_url?: string | null } | null
  type:                     string | null   // 'article' | 'review' | 'book-chapter' | ...
  doi:                      string | null   // e.g. "https://doi.org/10.xxxx/..."
}

const REVIEW_TITLE_RE = /\b(review|survey|meta-analysis|meta analysis|systematic review|scoping review|overview)\b/i

function reconstructAbstract(inverted: Record<string, number[]> | null): string | null {
  if (!inverted) return null
  const words: string[] = []
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words[pos] = word
  }
  return words.join(' ')
}

function mapOAPaper(w: OAWork): FoundPaper {
  const title   = w.display_name ?? ''
  const isReview =
    w.type === 'review' ||
    REVIEW_TITLE_RE.test(title)

  // DOI: OpenAlex는 "https://doi.org/10.xxx" 형태로 줌
  const rawDoi  = w.doi ?? null
  const doi     = rawDoi?.replace('https://doi.org/', '') ?? null

  return {
    semanticId:      w.id,   // OpenAlex ID (openalex.org/W...)
    title,
    authors:         (w.authorships ?? []).slice(0, 10).map((a) => a.author?.display_name ?? ''),
    year:            w.publication_year ?? null,
    abstract:        reconstructAbstract(w.abstract_inverted_index),
    doi,
    journal:         w.primary_location?.source?.display_name ?? null,
    citation_count:  w.cited_by_count ?? 0,
    open_access_url: w.open_access?.oa_url ?? null,
    paper_url:       rawDoi ?? null,
    is_review:       isReview,
  }
}
