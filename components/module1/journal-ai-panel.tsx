'use client'

import { useState, useTransition } from 'react'
import { recommendJournals, type JournalRecommendation } from '@/lib/actions/ai/journal-recommendations'
import { createJournal } from '@/lib/actions/journals'

interface Props {
  projectName:     string
  researchIntent:  string | null
  projectId:       string | null
  existingNames:   string[]          // 이미 등록된 저널명 (중복 방지)
}

export function JournalAiPanel({ projectName, researchIntent, projectId, existingNames }: Props) {
  const [open, setOpen]               = useState(false)
  const [results, setResults]         = useState<JournalRecommendation[]>([])
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [error, setError]             = useState<string | null>(null)
  const [savedIdx, setSavedIdx]       = useState<Set<number>>(new Set())
  const [isLoading, startLoading]     = useTransition()
  const [isSaving, startSaving]       = useTransition()

  const intent = researchIntent?.trim()

  function handleOpen() {
    setOpen(true)
    if (results.length === 0) fetchRecommendations()
  }

  function fetchRecommendations() {
    if (!intent) return
    setError(null)
    setResults([])
    setSelected(new Set())
    setSavedIdx(new Set())

    startLoading(async () => {
      const res = await recommendJournals(projectName, intent)
      if (!res.success) { setError(res.error); return }
      setResults(res.data)
      // 이미 목록에 없는 것들 기본 선택
      const auto = new Set<number>()
      res.data.forEach((j, i) => {
        if (!existingNames.some((n) => n.toLowerCase() === j.name.toLowerCase())) {
          auto.add(i)
        }
      })
      setSelected(auto)
    })
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleSave() {
    const toSave = results.filter((_, i) => selected.has(i) && !savedIdx.has(i))
    if (!toSave.length) return

    startSaving(async () => {
      const newSaved = new Set(savedIdx)
      for (const [i, j] of results.entries()) {
        if (!selected.has(i) || savedIdx.has(i)) continue
        await createJournal({
          project_id:    projectId,
          name:          j.name,
          publisher:     j.publisher || undefined,
          issn:          j.issn || undefined,
          impact_factor: j.impact_factor ?? undefined,
          scope:         j.scope || undefined,
          website:       j.website || undefined,
          notes:         j.insight,
          status:        'considering',
        })
        newSaved.add(i)
      }
      setSavedIdx(newSaved)
      setSelected(new Set())
    })
  }

  const selectedCount = [...selected].filter((i) => !savedIdx.has(i)).length
  const allSaved      = results.length > 0 && results.every((_, i) => savedIdx.has(i))

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-indigo-700 bg-indigo-950 px-4 py-2 text-sm font-medium text-indigo-300 hover:border-indigo-500 hover:bg-indigo-900 hover:text-indigo-200 transition-colors"
      >
        <span>✦</span>
        AI 저널 추천
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          {/* 배경 딤 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* 사이드 패널 */}
          <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-700 bg-zinc-950 shadow-2xl">
            {/* 헤더 */}
            <div className="flex shrink-0 items-start justify-between border-b border-zinc-800 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">✦</span>
                  <h2 className="text-base font-semibold text-zinc-100">AI 저널 추천</h2>
                </div>
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-xs">
                  {intent
                    ? `"${intent.slice(0, 60)}${intent.length > 60 ? '…' : ''}" 기반으로 분석`
                    : '프로젝트 Research Intent를 입력하면 더 정확한 추천이 제공됩니다.'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 결과 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!intent ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <p className="text-sm text-zinc-500">Research Intent가 없습니다.</p>
                  <p className="text-xs text-zinc-700">프로젝트를 편집해 Research Intent를 추가해 주세요.</p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
                  <p className="text-sm text-zinc-500">AI가 저널을 분석하고 있습니다…</p>
                  <p className="text-xs text-zinc-700">Research Intent를 기반으로 10개 후보를 탐색 중</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={fetchRecommendations}
                    className="rounded border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : results.length === 0 ? null : (
                <div className="space-y-3">
                  {results.map((j, i) => {
                    const isSelected  = selected.has(i)
                    const isSaved     = savedIdx.has(i)
                    const isExisting  = existingNames.some(
                      (n) => n.toLowerCase() === j.name.toLowerCase(),
                    )

                    return (
                      <div
                        key={i}
                        onClick={() => !isSaved && !isExisting && toggleSelect(i)}
                        className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                          isSaved
                            ? 'border-emerald-800 bg-emerald-950/30 cursor-default'
                            : isExisting
                            ? 'border-zinc-800 bg-zinc-900/50 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-950/50'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        {/* 체크 / 상태 */}
                        <div className="absolute top-3.5 right-3.5">
                          {isSaved ? (
                            <span className="text-xs text-emerald-400">✓ 저장됨</span>
                          ) : isExisting ? (
                            <span className="text-xs text-zinc-600">이미 있음</span>
                          ) : (
                            <div className={`h-4 w-4 rounded border-2 transition-colors ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-zinc-600'
                            }`}>
                              {isSelected && (
                                <span className="flex h-full items-center justify-center text-[10px] text-white">✓</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 순위 + 이름 */}
                        <div className="flex items-start gap-2 pr-16">
                          <span className="shrink-0 mt-0.5 text-xs font-bold text-zinc-600">
                            #{i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100 leading-snug">{j.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              {j.publisher && <span>{j.publisher}</span>}
                              {j.issn && <span>· ISSN {j.issn}</span>}
                              {j.impact_factor != null && (
                                <span className="font-medium text-amber-500">
                                  · IF {j.impact_factor.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Fit score */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${j.fit_score}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] text-zinc-500">
                            적합도 {j.fit_score}%
                          </span>
                        </div>

                        {/* Insight */}
                        <p className="mt-2.5 text-xs leading-relaxed text-zinc-400 border-t border-zinc-800 pt-2.5">
                          {j.insight}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 푸터 액션 */}
            {results.length > 0 && !isLoading && (
              <div className="shrink-0 border-t border-zinc-800 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={fetchRecommendations}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    ↻ 다시 추천
                  </button>
                  <div className="flex items-center gap-2">
                    {allSaved ? (
                      <p className="text-xs text-emerald-400">모두 저장 완료 ✓</p>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-500">
                          {selectedCount}개 선택됨
                        </p>
                        <button
                          onClick={handleSave}
                          disabled={selectedCount === 0 || isSaving}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                        >
                          {isSaving ? '저장 중…' : `${selectedCount}개 저널 목록에 추가`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
