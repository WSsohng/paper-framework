'use client'

import { useState, useCallback } from 'react'
import { generateSearchKeywords, type SearchDirection } from '@/lib/actions/ai/research-keywords'
import { searchPapers, type FoundPaper } from '@/lib/actions/search/semantic-scholar'
import { createReferencePaper } from '@/lib/actions/reference-papers'

interface Props {
  projectId:    string
  projectName:  string
  researchIntent: string | null
  existingDois: Set<string>
  onPapersSaved?: (count: number) => void
}

type SearchState = 'idle' | 'keywords' | 'searching' | 'results'

export function LiteratureDiscoveryPanel({
  projectId,
  projectName,
  researchIntent,
  existingDois,
  onPapersSaved,
}: Props) {
  const [state, setState]                     = useState<SearchState>('idle')
  const [keywords, setKeywords]               = useState<SearchDirection[]>([])
  const [selectedKw, setSelectedKw]           = useState<Set<string>>(new Set())
  const [results, setResults]                 = useState<Record<string, FoundPaper[]>>({})
  const [searchErrors, setSearchErrors]       = useState<Record<string, string>>({})
  const [selectedPapers, setSelectedPapers]   = useState<Set<string>>(new Set())
  const [loadingKw, setLoadingKw]             = useState(false)
  const [loadingSearch, setLoadingSearch]     = useState(false)
  const [savingPapers, setSavingPapers]       = useState(false)
  const [kwError, setKwError]                 = useState<string | null>(null)
  const [savedCount, setSavedCount]           = useState(0)

  const intent = researchIntent?.trim() ?? ''

  // ── Step 1: Generate keywords ──────────────────────────
  const handleGenerateKeywords = useCallback(async () => {
    if (!intent) return
    setLoadingKw(true)
    setKwError(null)
    setKeywords([])
    setSelectedKw(new Set())
    setResults({})
    setSelectedPapers(new Set())
    setState('idle')

    const result = await generateSearchKeywords(projectName, intent)

    if (!result.success) {
      setKwError(result.error)
    } else {
      setKeywords(result.data)
      // auto-select all keywords
      setSelectedKw(new Set(result.data.map((k) => k.keyword)))
      setState('keywords')
    }
    setLoadingKw(false)
  }, [projectName, intent])

  // ── Step 2: Search papers for selected keywords ────────
  const handleSearch = useCallback(async () => {
    if (selectedKw.size === 0) return
    setLoadingSearch(true)
    setResults({})
    setSearchErrors({})
    setSelectedPapers(new Set())
    setState('searching')

    const kwList = keywords.filter((k) => selectedKw.has(k.keyword))

    // Search sequentially to respect rate limits (1 req/s free tier)
    const newResults: Record<string, FoundPaper[]> = {}
    const newErrors:  Record<string, string>       = {}

    for (const kw of kwList) {
      const res = await searchPapers(kw.keyword, 15)
      if (res.success) {
        newResults[kw.keyword] = res.data
      } else {
        newErrors[kw.keyword] = res.error
      }
      // small delay to respect rate limits
      await delay(400)
    }

    setResults(newResults)
    setSearchErrors(newErrors)
    setState('results')
    setLoadingSearch(false)
  }, [selectedKw, keywords])

  // ── Step 3: Save selected papers ───────────────────────
  const handleSave = useCallback(async () => {
    if (selectedPapers.size === 0) return
    setSavingPapers(true)

    const allPapers = Object.values(results).flat()
    const toSave    = allPapers.filter((p) => selectedPapers.has(p.semanticId))

    let saved = 0
    for (const paper of toSave) {
      const res = await createReferencePaper({
        project_id: projectId,
        title:      paper.title,
        authors:    paper.authors,
        journal:    paper.journal ?? undefined,
        year:       paper.year    ?? undefined,
        doi:        paper.doi     ?? undefined,
        abstract:   paper.abstract ?? undefined,
        status:     'unread',
        tags:       [],
      })
      if (res.success) saved++
    }

    setSavedCount((c) => c + saved)
    setSelectedPapers(new Set())
    onPapersSaved?.(saved)
    setSavingPapers(false)
  }, [selectedPapers, results, projectId, onPapersSaved])

  // ── Derived values ─────────────────────────────────────
  const allFoundPapers  = Object.values(results).flat()
  const newPapers       = allFoundPapers.filter(
    (p) => !existingDois.has(p.doi ?? '') || !p.doi,
  )
  const totalFound      = allFoundPapers.length
  const totalSelected   = selectedPapers.size

  if (!intent) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          AI 문헌 탐색을 사용하려면 프로젝트에{' '}
          <span className="text-zinc-300">Research Intent</span>를 먼저 입력하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Research intent preview */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-3.5">
        <p className="text-xs font-medium text-zinc-500 mb-1">Research Intent</p>
        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{intent}</p>
      </div>

      {/* Step 1 button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerateKeywords}
          disabled={loadingKw}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loadingKw ? (
            <>
              <Spinner />
              키워드 생성 중…
            </>
          ) : (
            <>
              <span className="text-base">✦</span>
              AI 검색 방향 생성
            </>
          )}
        </button>
        {keywords.length > 0 && !loadingKw && (
          <span className="text-xs text-zinc-600">{keywords.length}개 방향 생성됨</span>
        )}
      </div>

      {kwError && (
        <p className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
          {kwError}
        </p>
      )}

      {/* Step 2: Keyword cards */}
      {keywords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">
              검색 방향 선택 <span className="text-zinc-600">({selectedKw.size}/{keywords.length})</span>
            </p>
            <button
              onClick={() => {
                if (selectedKw.size === keywords.length) {
                  setSelectedKw(new Set())
                } else {
                  setSelectedKw(new Set(keywords.map((k) => k.keyword)))
                }
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {selectedKw.size === keywords.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {keywords.map((kw) => {
              const isSelected = selectedKw.has(kw.keyword)
              const paperCount = results[kw.keyword]?.length ?? null
              return (
                <button
                  key={kw.keyword}
                  onClick={() => {
                    setSelectedKw((prev) => {
                      const next = new Set(prev)
                      if (next.has(kw.keyword)) next.delete(kw.keyword)
                      else next.add(kw.keyword)
                      return next
                    })
                  }}
                  className={`flex flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-indigo-500/50 bg-indigo-900/20 text-indigo-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold leading-tight">
                      {kw.direction}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {paperCount !== null && (
                        <span className="text-xs text-emerald-400">{paperCount}편</span>
                      )}
                      {searchErrors[kw.keyword] && (
                        <span className="text-xs text-red-400">오류</span>
                      )}
                      <span className={`h-4 w-4 rounded border text-xs flex items-center justify-center ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500 text-white'
                          : 'border-zinc-600 bg-transparent text-transparent'
                      }`}>✓</span>
                    </div>
                  </div>
                  <code className="block truncate text-[11px] text-zinc-500 font-mono">
                    &quot;{kw.keyword}&quot;
                  </code>
                  <p className="text-[11px] text-zinc-600 leading-snug line-clamp-2">
                    {kw.rationale}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Search button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSearch}
              disabled={loadingSearch || selectedKw.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingSearch ? (
                <>
                  <Spinner />
                  논문 검색 중… ({state === 'searching' ? '잠시만요' : ''})
                </>
              ) : (
                <>
                  <span>🔍</span>
                  선택한 {selectedKw.size}개 방향으로 논문 검색
                </>
              )}
            </button>
            {totalFound > 0 && (
              <span className="text-xs text-zinc-600">
                총 {totalFound}편 탐색됨
              </span>
            )}
          </div>

          {loadingSearch && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-4">
              <p className="text-sm text-zinc-400">
                Semantic Scholar에서 논문을 검색하고 있습니다…
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                API 요청 제한으로 인해 키워드당 약 0.4초 간격으로 검색됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Paper results */}
      {state === 'results' && Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">
              검색 결과 · {totalFound}편 탐색 ·{' '}
              <span className="text-emerald-400">{newPapers.length}편 신규</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // select all new papers (not already saved)
                  const newIds = newPapers.map((p) => p.semanticId)
                  setSelectedPapers((prev) => {
                    const next = new Set(prev)
                    newIds.forEach((id) => next.add(id))
                    return next
                  })
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                신규 전체 선택
              </button>
              <button
                onClick={() => setSelectedPapers(new Set())}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                전체 해제
              </button>
            </div>
          </div>

          {/* Results grouped by keyword */}
          {keywords
            .filter((kw) => results[kw.keyword] || searchErrors[kw.keyword])
            .map((kw) => (
              <KeywordResultGroup
                key={kw.keyword}
                keyword={kw}
                papers={results[kw.keyword] ?? []}
                error={searchErrors[kw.keyword]}
                existingDois={existingDois}
                selectedPapers={selectedPapers}
                onTogglePaper={(id) => {
                  setSelectedPapers((prev) => {
                    const next = new Set(prev)
                    if (next.has(id)) next.delete(id)
                    else next.add(id)
                    return next
                  })
                }}
              />
            ))}

          {/* Save button */}
          {totalSelected > 0 && (
            <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-zinc-950/90 backdrop-blur px-5 py-3.5 shadow-xl">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {totalSelected}편 선택됨
                </p>
                <p className="text-xs text-zinc-500">참고문헌에 추가됩니다</p>
              </div>
              <button
                onClick={handleSave}
                disabled={savingPapers}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {savingPapers ? <><Spinner />저장 중…</> : '참고문헌에 추가 →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {savedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-900/10 px-4 py-2.5">
          <span className="text-emerald-400 text-sm">✓</span>
          <p className="text-sm text-emerald-300">
            이번 세션에서 <strong>{savedCount}편</strong> 저장됨
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

interface KeywordGroupProps {
  keyword:       SearchDirection
  papers:        FoundPaper[]
  error?:        string
  existingDois:  Set<string>
  selectedPapers: Set<string>
  onTogglePaper: (id: string) => void
}

function KeywordResultGroup({
  keyword, papers, error, existingDois, selectedPapers, onTogglePaper,
}: KeywordGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const newCount = papers.filter((p) => !existingDois.has(p.doi ?? '') || !p.doi).length

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between bg-zinc-900 px-4 py-3 hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-zinc-400 text-xs">{expanded ? '▾' : '▸'}</span>
          <span className="text-xs font-semibold text-zinc-300 truncate">
            {keyword.direction}
          </span>
          <code className="hidden sm:block text-[10px] text-zinc-600 font-mono truncate max-w-[200px]">
            {keyword.keyword}
          </code>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {error ? (
            <span className="text-red-400">오류</span>
          ) : (
            <>
              <span className="text-zinc-500">{papers.length}편</span>
              {newCount > 0 && (
                <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-emerald-400">
                  신규 {newCount}
                </span>
              )}
            </>
          )}
        </div>
      </button>

      {/* Papers */}
      {expanded && (
        <div className="divide-y divide-zinc-800/60">
          {error ? (
            <p className="px-4 py-3 text-sm text-red-400">{error}</p>
          ) : papers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-600">검색 결과가 없습니다.</p>
          ) : (
            papers.map((paper) => {
              const alreadySaved = !!paper.doi && existingDois.has(paper.doi)
              const isSelected   = selectedPapers.has(paper.semanticId)
              return (
                <PaperRow
                  key={paper.semanticId}
                  paper={paper}
                  alreadySaved={alreadySaved}
                  isSelected={isSelected}
                  onToggle={() => {
                    if (!alreadySaved) onTogglePaper(paper.semanticId)
                  }}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

interface PaperRowProps {
  paper:        FoundPaper
  alreadySaved: boolean
  isSelected:   boolean
  onToggle:     () => void
}

function PaperRow({ paper, alreadySaved, isSelected, onToggle }: PaperRowProps) {
  const [showAbstract, setShowAbstract] = useState(false)

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors ${
        alreadySaved
          ? 'bg-zinc-900/30 opacity-50'
          : isSelected
          ? 'bg-indigo-900/10'
          : 'bg-zinc-900/10 hover:bg-zinc-800/30 cursor-pointer'
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        {alreadySaved ? (
          <span className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-emerald-400">
            ✓
          </span>
        ) : (
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] transition-colors ${
              isSelected
                ? 'border-indigo-400 bg-indigo-500 text-white'
                : 'border-zinc-600 bg-transparent group-hover:border-zinc-400'
            }`}
          >
            {isSelected && '✓'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
          {paper.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-600">
          {paper.authors.length > 0 && (
            <span>{paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' 외' : ''}</span>
          )}
          {paper.journal && <span>· {paper.journal}</span>}
          {paper.year    && <span>· {paper.year}</span>}
          {paper.doi     && <span>· DOI: {paper.doi}</span>}
          {paper.citation_count > 0 && (
            <span className="text-zinc-500">· 피인용 {paper.citation_count.toLocaleString()}</span>
          )}
        </div>

        {paper.abstract && (
          <div className="mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAbstract((v) => !v) }}
              className="text-[11px] text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              {showAbstract ? '초록 접기' : '초록 보기'}
            </button>
            {showAbstract && (
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                {paper.abstract}
              </p>
            )}
          </div>
        )}

        {alreadySaved && (
          <span className="mt-1 inline-block text-[11px] text-emerald-600">이미 저장됨</span>
        )}
      </div>

      {/* Open access link */}
      {paper.open_access_url && (
        <a
          href={paper.open_access_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded px-2 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 border border-zinc-700 hover:border-indigo-500 transition-colors"
        >
          PDF
        </a>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
