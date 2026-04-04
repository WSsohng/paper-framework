'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { batchAnalyzeJournalTracks } from '@/lib/actions/ai/batch-journal-analysis'

interface TrackInput {
  id:              string
  name:            string
  color:           string
  research_intent: string | null
}

interface Props {
  projectId:             string
  tracks:                TrackInput[]
  projectResearchIntent: string | null
  unanalyzedCount:       number
  totalJournalCount:     number
}

export function BatchJournalAnalysisButton({
  projectId,
  tracks,
  projectResearchIntent,
  unanalyzedCount,
  totalJournalCount,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ processed: number; skipped: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forceAll, setForceAll] = useState(false)
  const router = useRouter()

  const targetCount = forceAll ? totalJournalCount : unanalyzedCount

  if (tracks.length === 0 || totalJournalCount === 0) return null

  function handleClick() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await batchAnalyzeJournalTracks(
        projectId,
        tracks,
        projectResearchIntent,
        forceAll,
      )
      if (!res.success) {
        setError(res.error ?? '일괄 분석 실패')
      } else {
        setResult(res.data!)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {/* 재분석 토글 */}
        {unanalyzedCount === 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={forceAll}
              onChange={(e) => setForceAll(e.target.checked)}
              className="h-3 w-3 rounded accent-indigo-500"
            />
            <span className="text-[11px] text-zinc-600">전체 재분석</span>
          </label>
        )}
        <button
          onClick={handleClick}
          disabled={isPending || targetCount === 0}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60 ring-1 ring-indigo-700/50"
        >
          {isPending ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-indigo-500 border-t-indigo-200" />
              분석 중… (저널당 ~3초)
            </>
          ) : (
            <>
              <span>✦</span>
              {targetCount === 0
                ? '미분석 저널 없음'
                : `미분석 ${targetCount}개 일괄 AI 분석`}
            </>
          )}
        </button>
      </div>

      {result && (
        <p className="text-[11px] text-emerald-400">
          완료: {result.processed}개 분석
          {result.skipped > 0 && ` · ${result.skipped}개 건너뜀`}
          {result.failed > 0 && <span className="text-rose-400"> · {result.failed}개 실패</span>}
        </p>
      )}
      {error && <p className="text-[11px] text-rose-400 max-w-xs text-right">{error}</p>}
    </div>
  )
}
