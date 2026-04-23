'use server'

/**
 * 저널 IF 캐시 조회·보강 서버 액션 (M0 IF 필터).
 *
 * 흐름:
 *   1) 입력 저널명 목록을 정규화하여 중복 제거
 *   2) journal_if_cache 에서 기존 값(과 staleness) 조회
 *   3) 미스/만료 저널만 OpenAlex 병렬 조회 (polite pool, 동시성 제한)
 *   4) 조회 결과(null 포함)를 upsert 로 캐시에 기록
 *   5) 입력 원본 저널명 → impact_factor 매핑을 반환
 *
 * 공용 타입·유틸은 `@/lib/types/journal-if` 에 있다
 * (use server 파일 export 제약).
 */

import { createClient } from '@/lib/supabase/server'
import { normalizeJournalName, type ImpactFactorLookup } from '@/lib/types/journal-if'

// ── 설정 ──────────────────────────────────────────────────

/** 캐시 만료(일). 90일 넘으면 재조회. */
const STALE_DAYS = 90

/** OpenAlex 병렬 호출 최대 동시성. polite pool 은 10 req/s 권장. */
const CONCURRENCY = 6

/** 단건 조회 타임아웃(ms). 걸린 저널은 null 로 처리하고 계속 진행. */
const FETCH_TIMEOUT_MS = 4_000

// ── 공개 API ──────────────────────────────────────────────

/**
 * 저널명 배열 → IF 매핑.
 *
 * 빈/공백 입력은 결과 map 에서 제외된다.
 * 호출부는 `map[foundPaper.journal ?? ''] ?? null` 로 사용한다.
 */
export async function enrichJournalImpactFactors(
  journalNames: (string | null | undefined)[],
): Promise<ImpactFactorLookup> {
  const originalByNormalized      = new Map<string, string>()
  const originalsByNormalized     = new Map<string, Set<string>>()

  for (const raw of journalNames) {
    if (!raw) continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const norm = normalizeJournalName(trimmed)
    if (!norm) continue
    if (!originalByNormalized.has(norm)) {
      originalByNormalized.set(norm, trimmed)
    }
    const set = originalsByNormalized.get(norm) ?? new Set<string>()
    set.add(trimmed)
    originalsByNormalized.set(norm, set)
  }

  const result: Record<string, number | null> = {}
  let hits = 0
  let fetched = 0
  let errors = 0

  const normalizedList = Array.from(originalByNormalized.keys())
  if (normalizedList.length === 0) {
    return { map: result, fetched, hits, errors }
  }

  // ── 캐시 조회 ─────────────────────────────────────────
  const supabase = await createClient()
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: cached, error: cacheErr } = await supabase
    .from('journal_if_cache')
    .select('journal_name_normalized, impact_factor, cached_at')
    .in('journal_name_normalized', normalizedList)

  if (cacheErr) {
    console.warn('[journal-if-cache] cache query failed:', cacheErr.message)
  }

  const fresh = new Map<string, number | null>()
  const stale = new Set<string>()
  for (const row of cached ?? []) {
    if (row.cached_at && row.cached_at < staleCutoff) {
      stale.add(row.journal_name_normalized)
      continue
    }
    fresh.set(row.journal_name_normalized, row.impact_factor)
  }

  for (const [norm, ifValue] of fresh) {
    hits++
    for (const original of originalsByNormalized.get(norm) ?? []) {
      result[original] = ifValue
    }
  }

  // ── 미스·만료된 저널만 OpenAlex 조회 ──────────────────
  const toFetch = normalizedList.filter((n) => !fresh.has(n))
  if (toFetch.length === 0) {
    return { map: result, fetched, hits, errors }
  }

  const queue = [...toFetch]
  const upserts: {
    journal_name_normalized: string
    display_name:            string
    impact_factor:           number | null
    source:                  string
    issn:                    string | null
    works_count:             number | null
  }[] = []

  async function worker() {
    while (queue.length) {
      const norm = queue.shift()
      if (!norm) break
      const displayInput = originalByNormalized.get(norm) ?? norm
      try {
        const info = await fetchOpenAlexJournal(displayInput)
        const ifValue = info?.impact_factor ?? null
        for (const original of originalsByNormalized.get(norm) ?? []) {
          result[original] = ifValue
        }
        fetched++
        upserts.push({
          journal_name_normalized: norm,
          display_name:            info?.display_name ?? displayInput,
          impact_factor:           ifValue,
          source:                  'openalex',
          issn:                    info?.issn ?? null,
          works_count:             info?.works_count ?? null,
        })
      } catch (err) {
        errors++
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[journal-if-cache] openalex fail "${displayInput}":`, msg)
        // 일시적 실패는 캐시하지 않고 null 로 응답. 만료 캐시가 있으면 아래서 폴백.
        for (const original of originalsByNormalized.get(norm) ?? []) {
          if (!(original in result)) result[original] = null
        }
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, toFetch.length) },
    worker,
  )
  await Promise.all(workers)

  if (upserts.length) {
    const { error: upsertErr } = await supabase
      .from('journal_if_cache')
      .upsert(upserts, { onConflict: 'journal_name_normalized' })
    if (upsertErr) {
      console.warn('[journal-if-cache] upsert failed:', upsertErr.message)
    }
  }

  // 만료 후 재조회 실패 건은 이전 캐시값으로 폴백
  for (const norm of stale) {
    const originals = originalsByNormalized.get(norm) ?? new Set()
    for (const original of originals) {
      if (!(original in result)) {
        const cachedRow = (cached ?? []).find((r) => r.journal_name_normalized === norm)
        result[original] = cachedRow?.impact_factor ?? null
      }
    }
  }

  return { map: result, fetched, hits, errors }
}

// ── OpenAlex 단건 조회 ────────────────────────────────────

interface OpenAlexJournalInfo {
  display_name:   string
  impact_factor:  number | null
  issn:           string | null
  works_count:    number | null
}

async function fetchOpenAlexJournal(journalName: string): Promise<OpenAlexJournalInfo | null> {
  const url = new URL('https://api.openalex.org/sources')
  url.searchParams.set('search', journalName)
  url.searchParams.set('filter', 'type:journal')
  url.searchParams.set('per-page', '1')
  url.searchParams.set(
    'select',
    'display_name,issn_l,issn,summary_stats,works_count,type',
  )
  url.searchParams.set('mailto', 'academic-factory@research.local')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal:  ctrl.signal,
      next:    { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`openalex ${res.status}`)
    const json = await res.json() as { results?: OpenAlexSource[] }
    const top = (json.results ?? [])[0]
    if (!top) return null

    const summaryIf = top.summary_stats?.impact_factor ?? null
    const citedness = top.summary_stats?.['2yr_mean_citedness'] ?? null
    // 공식 impact_factor 우선, 없으면 2yr_mean_citedness (근사)
    const ifValue = summaryIf ?? citedness
    const rounded = ifValue == null ? null : Math.round(ifValue * 1000) / 1000

    return {
      display_name:  top.display_name,
      impact_factor: rounded,
      issn:          top.issn_l ?? top.issn?.[0] ?? null,
      works_count:   top.works_count ?? null,
    }
  } finally {
    clearTimeout(timer)
  }
}

interface OpenAlexSource {
  display_name:   string
  issn_l?:        string
  issn?:          string[]
  summary_stats?: {
    impact_factor?:        number
    '2yr_mean_citedness'?: number
  }
  works_count?: number
  type?:        string
}
