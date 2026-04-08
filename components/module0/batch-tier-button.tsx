'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { batchClassifyTiers } from '@/lib/actions/ai/batch-tier'

interface Props {
  projectId:      string
  researchIntent: string
  untieredCount:  number
  totalCount:     number
}

export function BatchTierButton({
  projectId,
  researchIntent,
  untieredCount,
  totalCount,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult]          = useState<{ processed: number; skipped: number } | null>(null)
  const [error, setError]            = useState<string | null>(null)
  const [forceAll, setForceAll]      = useState(false)
  const router = useRouter()

  const targetCount = forceAll ? totalCount : untieredCount

  if (untieredCount === 0 && !forceAll) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="text-emerald-500">✓</span>
        전체 T태깅 완료
        <button
          type="button"
          onClick={() => { setResult(null); setForceAll(true) }}
          className="underline text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          재분류
        </button>
      </div>
    )
  }

  function handleClick() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await batchClassifyTiers(projectId, researchIntent, forceAll)
      if (!res.success) {
        setError(res.error ?? 'AI 티어 분류 실패')
      } else {
        setResult(res.data!)
        router.refresh()
      }
    })
  }

  if (result) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="text-emerald-500">✓</span>
        {result.processed}편 T태깅 완료
        {result.skipped > 0 && <span>, {result.skipped}편 건너뜀</span>}
        <button
          type="button"
          onClick={() => { setResult(null); setForceAll(true) }}
          className="underline text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          재분류
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-amber-900/40 text-amber-300 hover:bg-amber-900/60 ring-1 ring-amber-700/50"
      >
        {isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-amber-200" />
            T태깅 중… ({targetCount}편, 배치당 ~5초)
          </>
        ) : (
          <>
            <span>✦</span>
            {forceAll
              ? `전체 ${targetCount}편 AI T태깅`
              : `미분류 ${targetCount}편 AI T태깅`}
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}
