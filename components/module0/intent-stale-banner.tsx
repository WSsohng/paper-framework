'use client'

import { useTransition, useState } from 'react'
import { batchExtractConcepts } from '@/lib/actions/ai/extract-concepts'

interface Props {
  projectId:      string
  researchIntent: string
  staleCount:     number   // intent 변경 이후 분석이 안 된 논문 수
  totalCount:     number
  intentUpdatedAt: string  // ISO datetime — 변경 시각 표시용
}

export function IntentStaleBanner({
  projectId, researchIntent, staleCount, totalCount, intentUpdatedAt,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  if (staleCount === 0 || done) return null

  const changedDate = new Date(intentUpdatedAt).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  function handleReanalyze() {
    startTransition(async () => {
      // forceAll = true: 기존 분석값이 있어도 전체 재계산
      await batchExtractConcepts(projectId, researchIntent, true)
      setDone(true)
    })
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-800/60 bg-amber-950/25 px-4 py-3">
      <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">
          Research Intent가 변경되었습니다 ({changedDate})
        </p>
        <p className="mt-0.5 text-xs text-amber-500/80">
          {staleCount}편의 논문이 변경 전 기준으로 분석된 상태입니다.
          새 Intent 기준으로 관련도·우선순위를 재계산하면 더 정확한 결과를 얻을 수 있습니다.
        </p>
      </div>
      <button
        type="button"
        onClick={handleReanalyze}
        disabled={isPending}
        className="
          shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          bg-amber-500/20 text-amber-300 border border-amber-700/50
          hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        "
      >
        {isPending ? (
          <><span className="animate-spin inline-block">⟳</span> 재분석 중… ({totalCount}편)</>
        ) : (
          <><span>✦</span> 지금 재분석 ({staleCount}편)</>
        )}
      </button>
    </div>
  )
}
