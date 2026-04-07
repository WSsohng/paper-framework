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

  const limit    = Math.min(opts.limit ?? 15, 50)
  const yearFrom = opts.yearFrom ?? null

  const params = new URLSearchParams({
    search:   keyword,
    'per-page': String(Math.min(limit * 2, 50)), // 여분 확보 후 필터
    sort:     'relevance_score:desc',
    select:   'id,display_name,authorships,publication_year,abstract_inverted_index,primary_location,cited_by_count,open_access,type,doi',
  })

  if (yearFrom) {
    params.set('filter', `publication_year:>=${yearFrom}`)
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
      return { success: false, error: `OpenAlex 오류: HTTP ${res.status}` }
    }

    const json = await res.json() as { results: OAWork[]; meta: { count: number } }
    let papers: FoundPaper[] = (json.results ?? []).map(mapOAPaper)

    // 연도 필터 (API 필터가 적용 안 된 경우 보완)
    if (yearFrom) {
      papers = papers.filter(p => p.year == null || p.year >= yearFrom)
    }

    // 최신순 정렬
    papers.sort((a, b) => {
      const yearDiff = (b.year ?? 0) - (a.year ?? 0)
      if (yearDiff !== 0) return yearDiff
      return b.citation_count - a.citation_count
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
