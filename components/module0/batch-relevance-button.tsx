'use client'

import { useTransition, useState } from 'react'
import { batchTagRelevance } from '@/lib/actions/ai/tag-relevance'

interface Props {
  projectId:           string
  trackId:             string
  trackName:           string
  trackResearchIntent: string
  untaggedCount:       number
  totalCount:          number
}

export function BatchRelevanceButton({
  projectId, trackId, trackName, trackResearchIntent, untaggedCount, totalCount,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ processed: number; skipped: number } | null>(null)
  const [forceAll, setForceAll] = useState(false)

  const targetCount = forceAll ? totalCount : untaggedCount

  if (untaggedCount === 0 && !forceAll) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
        전체 논문 R태깅 완료
        <button
          type="button"
          onClick={() => setForceAll(true)}
          className="underline text-zinc-400 hover:text-zinc-600"
        >
          재분석
        </button>
      </div>
    )
  }

  function handleClick() {
    startTransition(async () => {
      const res = await batchTagRelevance(projectId, trackId, trackResearchIntent, forceAll)
      if (res.success) setStatus(res.data)
    })
  }

  if (status) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        ✓ {status.processed}편 R태깅 완료{status.skipped > 0 ? `, ${status.skipped}편 건너뜀` : ''}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-emerald-50 text-emerald-700 border border-emerald-200
        hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300
        dark:border-emerald-800 dark:hover:bg-emerald-900/40
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
      "
    >
      {isPending ? (
        <>
          <span className="animate-spin">⟳</span>
          R태깅 중… ({targetCount}편)
        </>
      ) : (
        <>
          <span>✦</span>
          AI R태그 일괄 분석
          <span className="opacity-70">({untaggedCount}편 미태깅)</span>
        </>
      )}
    </button>
  )
}
