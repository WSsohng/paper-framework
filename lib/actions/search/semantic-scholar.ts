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
}

export type PaperSearchResult =
  | { success: true;  data: FoundPaper[]; total: number }
  | { success: false; error: string }

const SS_BASE = 'https://api.semanticscholar.org/graph/v1'
const FIELDS  = 'title,authors,year,abstract,externalIds,citationCount,publicationVenue,openAccessPdf,url'

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
        // 클라이언트가 카운트다운 후 재시도할 수 있도록 즉시 반환
        return { success: false, error: 'RATE_LIMIT' }
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
  openAccessPdf:    { url: string } | null
  url:              string | null
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
  }
}
