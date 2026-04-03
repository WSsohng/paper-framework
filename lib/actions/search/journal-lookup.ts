'use server'

export interface JournalSuggestion {
  name:           string
  publisher:      string | null
  issn:           string | null      // primary ISSN
  impact_factor:  number | null
  scope:          string | null
  website:        string | null
  works_count:    number | null
}

export type JournalLookupResult =
  | { success: true;  data: JournalSuggestion[] }
  | { success: false; error: string }

/**
 * OpenAlex API로 저널명을 검색해 메타데이터 후보를 반환합니다.
 * https://openalex.org/docs/api-entities/sources/search-sources
 */
export async function lookupJournal(query: string): Promise<JournalLookupResult> {
  if (!query || query.trim().length < 2) {
    return { success: true, data: [] }
  }

  const url = new URL('https://api.openalex.org/sources')
  url.searchParams.set('search', query.trim())
  url.searchParams.set('filter', 'type:journal')
  url.searchParams.set('per-page', '8')
  url.searchParams.set('select', 'display_name,host_organization_name,issn_l,issn,summary_stats,homepage_url,works_count,type')
  url.searchParams.set('mailto', 'academic-factory@research.local')  // OpenAlex polite pool

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },  // 1시간 캐시
    })

    if (!res.ok) {
      return { success: false, error: `OpenAlex error: ${res.status}` }
    }

    const json = await res.json()
    const results = (json.results ?? []) as OpenAlexSource[]

    const data: JournalSuggestion[] = results
      .filter((r) => r.display_name)
      .map((r) => ({
        name:          r.display_name,
        publisher:     r.host_organization_name ?? null,
        issn:          r.issn_l ?? r.issn?.[0] ?? null,
        impact_factor: r.summary_stats?.impact_factor ?? r.summary_stats?.['2yr_mean_citedness'] ?? null,
        scope:         null,  // OpenAlex에 scope 텍스트 없음 — 추후 AI로 보완
        website:       r.homepage_url ?? null,
        works_count:   r.works_count ?? null,
      }))

    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

// ── OpenAlex Source 타입 (응답 중 필요한 필드만) ──────────

interface OpenAlexSource {
  display_name:            string
  host_organization_name?: string
  issn_l?:                 string
  issn?:                   string[]
  summary_stats?: {
    impact_factor?:        number
    '2yr_mean_citedness'?: number
  }
  homepage_url?: string
  works_count?:  number
}
