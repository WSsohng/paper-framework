'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractPaperConcepts } from '@/lib/actions/ai/extract-concepts'

interface Props {
  paperId: string
  researchIntent: string
  hasAnalysis: boolean
}

export function ConceptExtractButton({ paperId, researchIntent, hasAnalysis }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await extractPaperConcepts(paperId, researchIntent)
      if (!result.success) {
        setError(result.error ?? '분석 실패')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 ring-1 ring-zinc-700"
      >
        {isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-zinc-200" />
            분석 중…
          </>
        ) : (
          <>
            <span className="text-indigo-400">✦</span>
            {hasAnalysis ? 'AI 재분석' : 'AI 개념 분석'}
          </>
        )}
      </button>
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
    </div>
  )
}
