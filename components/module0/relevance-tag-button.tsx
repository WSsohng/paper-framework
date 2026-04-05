'use client'

import { useTransition, useState } from 'react'
import { tagPaperRelevance } from '@/lib/actions/ai/tag-relevance'
import { updateRelevanceLevel } from '@/lib/actions/reference-paper-tracks'
import { RelevanceBadge } from '@/components/module0/relevance-badge'
import type { RelevanceLevel, TrackRelevance } from '@/lib/types'

interface Props {
  paperId:    string
  trackId:    string
  trackResearchIntent: string
  projectId?: string
  existing?:  TrackRelevance | null
}

const LEVEL_LABELS: Record<RelevanceLevel, string> = { 1: 'R1', 2: 'R2', 3: 'R3' }

export function RelevanceTagButton({
  paperId, trackId, trackResearchIntent, projectId, existing,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ level: RelevanceLevel; reason: string | null } | null>(
    existing ? { level: existing.relevance_level, reason: existing.relevance_reason } : null,
  )
  const [showMenu, setShowMenu] = useState(false)

  function handleAiTag() {
    startTransition(async () => {
      const res = await tagPaperRelevance(paperId, trackId, trackResearchIntent, projectId)
      if (res.success) {
        setResult({ level: res.data.relevance_level, reason: res.data.reason })
      }
    })
  }

  function handleManualLevel(level: RelevanceLevel) {
    setShowMenu(false)
    startTransition(async () => {
      const res = await updateRelevanceLevel(paperId, trackId, level)
      if (res.success) {
        setResult({ level: res.data.relevance_level, reason: res.data.relevance_reason })
      }
    })
  }

  // 태깅됨 → 배지 + 수동 변경 드롭다운
  if (result) {
    return (
      <div className="relative flex items-center gap-1">
        <RelevanceBadge level={result.level} reason={result.reason} />
        <button
          type="button"
          onClick={() => setShowMenu(v => !v)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs px-1"
          title="연관도 변경"
        >
          ▾
        </button>
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg text-xs min-w-[120px]">
            {([1, 2, 3] as RelevanceLevel[]).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => handleManualLevel(level)}
                className={`
                  flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800
                  ${result.level === level ? 'font-semibold' : ''}
                `}
              >
                <RelevanceBadge level={level} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 미태깅 → AI 태그 버튼
  return (
    <button
      type="button"
      onClick={handleAiTag}
      disabled={isPending}
      className="
        inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed
        border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400
        hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400
        text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {isPending ? '…' : '+ R태그'}
    </button>
  )
}
