'use server'

export interface FoundPaper {
  semanticId:      string
  title:           string
  authors:         string[]
  year:            number | null
  abstract:        string | null
  doi:             string | null
  journal:         string | null
  citation_count:  number
  open_access_url: string | null
  paper_url:       string | null
  is_review:       boolean   // 리뷰/서베이 논문 여부
  /**
   * 저널 Impact Factor (M0 IF 필터용).
   * - `undefined`: 아직 보강 미수행 (검색 직후 상태)
   * - `null`:      보강 시도했지만 OpenAlex 에 매칭되는 저널 없음 → UI 에서 'IF ?' 배지
   * - `number`:    OpenAlex `impact_factor` 또는 `2yr_mean_citedness` (근사)
   */
  impact_factor?:  number | null
}

export type PaperSearchResult =
  | { success: true;  data: FoundPaper[]; total: number }
  | { success: false; error: string; retryAfterSecs?: number }

const SS_BASE = 'https://api.semanticscholar.org/graph/v1'
const FIELDS  = 'title,authors,year,abstract,externalIds,citationCount,publicationVenue,publicationTypes,openAccessPdf,url'

export interface SearchOptions {
  limit?:    number
  yearFrom?: number  // 이 연도 이후 논문만 포함 (client-side 필터)
}

export async function searchPapers(
  keyword: string,
  limitOrOpts: number | SearchOptions = 15,
): Promise<PaperSearchResult> {
  const opts: SearchOptions =
    typeof limitOrOpts === 'number' ? { limit: limitOrOpts } : limitOrOpts

  const limit    = Math.min(opts.limit ?? 15, 50)
  const yearFrom = opts.yearFrom ?? null

  // Semantic Scholar는 최신순 sort를 직접 지원하지 않으므로
  // yearFrom 필터가 있으면 더 많이 가져온 뒤 client-side에서 필터·정렬
  const fetchLimit = yearFrom ? Math.min(limit * 3, 100) : limit

  const params = new URLSearchParams({
    query:  keyword,
    fields: FIELDS,
    limit:  String(fetchLimit),
  })

  const headers: Record<string, string> = {}
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY
  if (apiKey) headers['x-api-key'] = apiKey

  try {
    const res = await fetch(`${SS_BASE}/paper/search?${params}`, {
      headers,
      next: { revalidate: 300 },
    })

      if (!res.ok) {
        if (res.status === 429) {
          // Retry-After 헤더로 실제 대기 시간 파악
          const retryAfter = res.headers.get('Retry-After') ?? res.headers.get('x-ratelimit-reset-after')
          const retryAfterSecs = retryAfter ? Math.ceil(parseFloat(retryAfter)) : 60
          return { success: false, error: 'RATE_LIMIT', retryAfterSecs }
        }
        return { success: false, error: `Semantic Scholar 오류: HTTP ${res.status}` }
      }

    const json = await res.json() as {
      data:  SemanticScholarPaper[]
      total: number
    }

    let papers: FoundPaper[] = (json.data ?? []).map(mapPaper)

    // 연도 필터 (client-side)
    if (yearFrom) {
      papers = papers.filter(p => p.year == null || p.year >= yearFrom)
    }

    // 최신순 정렬: year 내림차순, 동일 연도는 인용 수 내림차순
    papers.sort((a, b) => {
      const yearDiff = (b.year ?? 0) - (a.year ?? 0)
      if (yearDiff !== 0) return yearDiff
      return b.citation_count - a.citation_count
    })

    papers = papers.slice(0, limit)

    return { success: true, data: papers, total: json.total ?? papers.length }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `검색 실패: ${msg}` }
  }
}

// ── internal ──────────────────────────────────────────────

interface SemanticScholarPaper {
  paperId:          string
  title:            string
  authors:          { name: string }[]
  year:             number | null
  abstract:         string | null
  externalIds:      Record<string, string> | null
  citationCount:    number
  publicationVenue: { name: string } | null
  publicationTypes: { category: string }[] | null
  openAccessPdf:    { url: string } | null
  url:              string | null
}

const REVIEW_TITLE_KEYWORDS = /\b(review|survey|meta-analysis|meta analysis|systematic review|scoping review|overview|umbrella review)\b/i

function detectReview(p: SemanticScholarPaper): boolean {
  // Semantic Scholar publicationTypes 우선
  if (p.publicationTypes?.some((t) => t.category === 'Review')) return true
  // 제목 키워드 보조 감지
  return REVIEW_TITLE_KEYWORDS.test(p.title ?? '')
}

function mapPaper(p: SemanticScholarPaper): FoundPaper {
  return {
    semanticId:      p.paperId,
    title:           p.title,
    authors:         (p.authors ?? []).map((a) => a.name),
    year:            p.year ?? null,
    abstract:        p.abstract ?? null,
    doi:             p.externalIds?.DOI ?? null,
    journal:         p.publicationVenue?.name ?? null,
    citation_count:  p.citationCount ?? 0,
    open_access_url: p.openAccessPdf?.url ?? null,
    paper_url:       p.url ?? null,
    is_review:       detectReview(p),
  }
}
