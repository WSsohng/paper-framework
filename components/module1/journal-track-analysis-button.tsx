'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeJournalTrackFit } from '@/lib/actions/ai/journal-track-analysis'

interface TrackInput {
  id:              string
  name:            string
  color:           string
  research_intent: string | null
}

interface Props {
  journalId:             string
  journalName:           string
  journalScope:          string | null
  journalIF:             number | null
  tracks:                TrackInput[]
  projectResearchIntent: string | null
  hasAnalysis:           boolean
}

export function JournalTrackAnalysisButton({
  journalId,
  journalName,
  journalScope,
  journalIF,
  tracks,
  projectResearchIntent,
  hasAnalysis,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAnalyze() {
    setError(null)
    startTransition(async () => {
      const result = await analyzeJournalTrackFit(
        journalId,
        journalName,
        journalScope,
        journalIF,
        tracks,
        projectResearchIntent,
      )
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAnalyze}
        disabled={isPending || tracks.length === 0}
        className="flex items-center gap-1.5 rounded-lg border border-indigo-800/50 bg-indigo-950/40 px-3 py-1 text-[11px] font-medium text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <>
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-indigo-500 border-t-transparent" />
            분석 중…
          </>
        ) : (
          <>
            ✦ {hasAnalysis ? '재분석' : 'AI 트랙 분석'}
          </>
        )}
      </button>
      {error && (
        <p className="text-[10px] text-red-500 max-w-[200px] text-right leading-snug">{error}</p>
      )}
    </div>
  )
}
