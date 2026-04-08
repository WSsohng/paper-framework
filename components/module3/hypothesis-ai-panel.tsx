'use client'

import { useState, useTransition } from 'react'
import { generateHypotheses, type HypothesisProposal } from '@/lib/actions/ai/generate-hypotheses'
import { createHypothesis } from '@/lib/actions/hypotheses'
import { useRouter } from 'next/navigation'

interface Props {
  projectId:      string
  trackId?:       string | null
  trackName?:     string | null
  researchIntent: string | null
}

export function HypothesisAiPanel({ projectId, trackId, trackName, researchIntent }: Props) {
  const [open, setOpen]             = useState(false)
  const [proposals, setProposals]   = useState<HypothesisProposal[]>([])
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [savedIdx, setSavedIdx]     = useState<Set<number>>(new Set())
  const [expanded, setExpanded]     = useState<Set<number>>(new Set())
  const [error, setError]           = useState<string | null>(null)
  const [isLoading, startLoading]   = useTransition()
  const [isSaving, startSaving]     = useTransition()
  const router = useRouter()

  function handleOpen() {
    setOpen(true)
    if (proposals.length === 0) fetchProposals()
  }

  function fetchProposals() {
    setError(null)
    setProposals([])
    setSelected(new Set())
    setSavedIdx(new Set())
    setExpanded(new Set())

    startLoading(async () => {
      const res = await generateHypotheses({ projectId, trackId, researchIntent })
      if (!res.success) { setError(res.error); return }
      setProposals(res.data!)
      // 전체 기본 선택
      setSelected(new Set(res.data!.map((_, i) => i)))
    })
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleSave() {
    const toSave = proposals.filter((_, i) => selected.has(i) && !savedIdx.has(i))
    if (!toSave.length) return

    startSaving(async () => {
      const newSaved = new Set(savedIdx)
      for (const [i, p] of proposals.entries()) {
        if (!selected.has(i) || savedIdx.has(i)) continue
        await createHypothesis({
          track_id:    trackId ?? null,
          title:       p.title,
          statement:   p.statement,
          methodology: p.methodology,
          rationale:   p.rationale,
          status:      'draft',
        })
        newSaved.add(i)
      }
      setSavedIdx(newSaved)
      setSelected(new Set())
      router.refresh()
    })
  }

  const selectedCount = [...selected].filter((i) => !savedIdx.has(i)).length
  const allSaved      = proposals.length > 0 && proposals.every((_, i) => savedIdx.has(i))

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-violet-700 bg-violet-950 px-4 py-2 text-sm font-medium text-violet-300 hover:border-violet-500 hover:bg-violet-900 hover:text-violet-200 transition-colors"
      >
        <span>✦</span>
        AI 가설 제안
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
                  <span className="text-violet-400">✦</span>
                  <h2 className="text-base font-semibold text-zinc-100">AI 가설 제안</h2>
                </div>
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-xs">
                  {trackName
                    ? `"${trackName}" 트랙 기반으로 검증이 필요한 가설을 도출합니다`
                    : researchIntent
                    ? `"${researchIntent.slice(0, 60)}${researchIntent.length > 60 ? '…' : ''}" 기반 분석`
                    : '수집된 참고문헌·자산·아이디어 기반으로 가설을 도출합니다'}
                </p>
                <div className="mt-2 rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-400/80 leading-relaxed max-w-xs">
                  AI 제안은 참고용입니다. 직관적으로 가능성이 높아 보이는 것을 선택하고, 방법론은 직접 조정하세요.
                </div>
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
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
                  <p className="text-sm text-zinc-500">참고문헌과 자산을 분석하고 있습니다…</p>
                  <p className="text-xs text-zinc-700">T1/T2 논문 Abstract + 아이디어 메모 + 연구 질문 종합 중</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={fetchProposals}
                    className="rounded border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : proposals.length === 0 ? null : (
                <div className="space-y-3">
                  {proposals.map((p, i) => {
                    const isSelected = selected.has(i)
                    const isSaved    = savedIdx.has(i)
                    const isExpanded = expanded.has(i)

                    return (
                      <div
                        key={i}
                        className={`relative rounded-xl border p-4 transition-all ${
                          isSaved
                            ? 'border-emerald-800 bg-emerald-950/30 cursor-default'
                            : isSelected
                            ? 'border-violet-600 bg-violet-950/40 cursor-pointer'
                            : 'border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700'
                        }`}
                        onClick={() => !isSaved && toggleSelect(i)}
                      >
                        {/* 체크 / 저장 상태 */}
                        <div className="absolute top-3.5 right-3.5">
                          {isSaved ? (
                            <span className="text-xs text-emerald-400">✓ 저장됨</span>
                          ) : (
                            <div className={`h-4 w-4 rounded border-2 transition-colors ${
                              isSelected
                                ? 'border-violet-500 bg-violet-500'
                                : 'border-zinc-600'
                            }`}>
                              {isSelected && (
                                <span className="flex h-full items-center justify-center text-[10px] text-white">✓</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 번호 + 제목 */}
                        <div className="flex items-start gap-2 pr-10">
                          <span className="shrink-0 mt-0.5 text-xs font-bold text-zinc-600">#{i + 1}</span>
                          <p className="text-sm font-semibold text-zinc-100 leading-snug">{p.title}</p>
                        </div>

                        {/* 가설 진술 */}
                        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{p.statement}</p>

                        {/* 증명 방법론 + 근거 토글 */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(i) }}
                          className="mt-2 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          {isExpanded ? '▴ 접기' : '▾ 증명 방법 · 근거 보기'}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
                                증명 방법론
                              </p>
                              <p className="text-xs text-zinc-400 leading-relaxed">{p.methodology}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
                                근거
                              </p>
                              <p className="text-xs text-zinc-500 leading-relaxed">{p.rationale}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 푸터 액션 */}
            {proposals.length > 0 && !isLoading && (
              <div className="shrink-0 border-t border-zinc-800 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={fetchProposals}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    ↻ 다시 생성
                  </button>
                  <div className="flex items-center gap-2">
                    {allSaved ? (
                      <p className="text-xs text-emerald-400">모두 저장 완료 ✓</p>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-500">{selectedCount}개 선택됨</p>
                        <button
                          onClick={handleSave}
                          disabled={selectedCount === 0 || isSaving}
                          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
                        >
                          {isSaving ? '저장 중…' : `${selectedCount}개 가설 추가`}
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
