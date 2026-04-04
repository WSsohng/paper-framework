'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { batchExtractConcepts } from '@/lib/actions/ai/extract-concepts'

interface Props {
  projectId: string
  researchIntent: string
  unanalyzedCount: number
}

export function BatchAnalyzeButton({ projectId, researchIntent, unanalyzedCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ processed: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (unanalyzedCount === 0) return null

  function handleClick() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await batchExtractConcepts(projectId, researchIntent)
      if (!res.success) {
        setError(res.error ?? '일괄 분석 실패')
      } else {
        setResult(res.data!)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60 ring-1 ring-indigo-700/50"
      >
        {isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border border-indigo-500 border-t-indigo-200" />
            일괄 분석 중… (논문당 ~3초)
          </>
        ) : (
          <>
            <span>✦</span>
            미분석 {unanalyzedCount}편 일괄 AI 분석
          </>
        )}
      </button>
      {result && (
        <p className="text-[11px] text-emerald-400">
          완료: {result.processed}편 분석, {result.skipped}편 건너뜀
        </p>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}
