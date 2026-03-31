'use server'

export interface FoundPaper {
  semanticId:     string
  title:          string
  authors:        string[]
  year:           number | null
  abstract:       string | null
  doi:            string | null
  journal:        string | null
  citation_count: number
  open_access_url: string | null
  paper_url:      string | null
}

export type PaperSearchResult =
  | { success: true;  data: FoundPaper[]; total: number }
  | { success: false; error: string }

const SS_BASE  = 'https://api.semanticscholar.org/graph/v1'
const FIELDS   = 'title,authors,year,abstract,externalIds,citationCount,publicationVenue,openAccessPdf,url'

export async function searchPapers(
  keyword: string,
  limit = 15,
): Promise<PaperSearchResult> {
  const params = new URLSearchParams({
    query:  keyword,
    fields: FIELDS,
    limit:  String(Math.min(limit, 50)),
  })

  const headers: Record<string, string> = {}
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY
  if (apiKey) headers['x-api-key'] = apiKey

  try {
    const res = await fetch(`${SS_BASE}/paper/search?${params}`, {
      headers,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      if (res.status === 429) {
        return { success: false, error: 'API 요청 한도 초과. 잠시 후 다시 시도해 주세요.' }
      }
      return { success: false, error: `Semantic Scholar 오류: HTTP ${res.status}` }
    }

    const json = await res.json() as {
      data:  SemanticScholarPaper[]
      total: number
    }

    const papers: FoundPaper[] = (json.data ?? []).map(mapPaper)

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
