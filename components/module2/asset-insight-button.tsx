'use client'

import { useState, useTransition } from 'react'
import { extractAssetInsights, type AssetInsight } from '@/lib/actions/ai/asset-insights'
import { createAsset } from '@/lib/actions/assets'
import { ASSET_SECTION_LABELS } from '@/lib/types'

interface RefPaperOption {
  id:       string
  title:    string
  abstract: string | null
  notes:    string | null
  tier:     number | null
}

interface Props {
  projectId:           string
  referencePapers:     RefPaperOption[]
  existingAssetTitles: string[]
  initialPaperId?:     string   // pre-select this paper when dialog opens
  triggerLabel?:       string   // custom button label
}

const TIER_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' }

export function AssetInsightButton({ projectId, referencePapers, existingAssetTitles, initialPaperId, triggerLabel }: Props) {
  const [open, setOpen]               = useState(false)
  const [selectedPaperId, setSelected] = useState<string>(initialPaperId ?? '')
  const [insights,  setInsights]       = useState<AssetInsight[]>([])
  const [savedIdx,  setSavedIdx]       = useState<Set<number>>(new Set())
  const [checkedIdx,setCheckedIdx]     = useState<Set<number>>(new Set())
  const [error,     setError]          = useState<string | null>(null)

  const [isExtracting, startExtract] = useTransition()
  const [isSaving,     startSave]    = useTransition()

  const selectedPaper = referencePapers.find((p) => p.id === selectedPaperId)

  function handleExtract() {
    if (!selectedPaper) return
    setError(null)
    setInsights([])
    setSavedIdx(new Set())
    setCheckedIdx(new Set())

    startExtract(async () => {
      const result = await extractAssetInsights(
        selectedPaper,
        '',   // researchIntent는 선택적
        existingAssetTitles,
      )
      if (!result.success) { setError(result.error); return }
      setInsights(result.data)
      setCheckedIdx(new Set(result.data.map((_, i) => i)))  // 전부 선택 기본값
    })
  }

  function toggleCheck(i: number) {
    setCheckedIdx((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleSave() {
    const toSave = insights
      .map((ins, i) => ({ ins, i }))
      .filter(({ i }) => checkedIdx.has(i) && !savedIdx.has(i))

    startSave(async () => {
      for (const { ins, i } of toSave) {
        await createAsset({
          project_id:         projectId,
          type:               ins.type,
          title:              ins.title,
          content:            ins.content,
          reference_paper_id: selectedPaperId || null,
          paper_section:      ins.paper_section,
          tags:               [],
        })
        setSavedIdx((prev) => new Set([...prev, i]))
      }
    })
  }

  const unsavedChecked = [...checkedIdx].filter((i) => !savedIdx.has(i)).length
  const allSaved = insights.length > 0 && insights.every((_, i) => savedIdx.has(i))

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
      >
        <span className="text-indigo-500">✦</span>
        {triggerLabel ?? 'AI 인사이트 추출'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex w-full max-w-xl flex-col rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
               style={{ maxHeight: '85vh' }}>
            {/* 헤더 */}
            <div className="shrink-0 border-b border-zinc-800 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">AI 인사이트 추출</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    참고문헌의 abstract/메모를 분석해 논문에 바로 쓸 수 있는 인사이트를 추출합니다.
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="rounded p-1 text-zinc-500 hover:text-zinc-300">✕</button>
              </div>
            </div>

            {/* 논문 선택 */}
            <div className="shrink-0 px-6 py-4 border-b border-zinc-800">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">분석할 참고문헌 선택</label>
              <div className="flex gap-2">
                <select
                  value={selectedPaperId}
                  onChange={(e) => { setSelected(e.target.value); setInsights([]); setError(null) }}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">— 논문을 선택하세요</option>
                  {referencePapers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tier ? `[${TIER_LABEL[p.tier]}] ` : ''}{p.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExtract}
                  disabled={!selectedPaperId || isExtracting}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors shrink-0"
                >
                  {isExtracting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-400 border-t-white" />
                      분석 중…
                    </span>
                  ) : '추출'}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </div>

            {/* 결과 목록 */}
            {insights.length > 0 && (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {insights.map((ins, i) => {
                  const isChecked = checkedIdx.has(i)
                  const isSaved   = savedIdx.has(i)
                  return (
                    <div
                      key={i}
                      onClick={() => !isSaved && toggleCheck(i)}
                      className={`rounded-lg border p-3.5 transition-all cursor-pointer ${
                        isSaved    ? 'border-emerald-800/50 bg-emerald-950/20 cursor-default' :
                        isChecked  ? 'border-indigo-700/50 bg-indigo-950/30' :
                                     'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 체크박스 */}
                        <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors ${
                          isSaved   ? 'border-emerald-500 bg-emerald-500' :
                          isChecked ? 'border-indigo-500 bg-indigo-500'   :
                                      'border-zinc-600'
                        }`}>
                          {(isChecked || isSaved) && (
                            <span className="flex h-full items-center justify-center text-[9px] text-white font-bold">✓</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium text-zinc-200">{ins.title}</span>
                            <span className="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-500">
                              {ASSET_SECTION_LABELS[ins.paper_section] ?? ins.paper_section}
                            </span>
                            <span className="text-[10px] text-zinc-700">
                              {ins.type === 'quote' ? '인용구' : '메모'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{ins.content}</p>
                          <p className="mt-1 text-[10px] text-zinc-600 leading-relaxed">💡 {ins.reason}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 푸터 */}
            {insights.length > 0 && (
              <div className="shrink-0 border-t border-zinc-800 px-6 py-3 flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {checkedIdx.size}개 선택
                </span>
                {allSaved ? (
                  <span className="text-xs text-emerald-400">모두 저장 완료 ✓</span>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={unsavedChecked === 0 || isSaving}
                    className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                  >
                    {isSaving ? '저장 중…' : `${unsavedChecked}개 자산으로 저장`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
