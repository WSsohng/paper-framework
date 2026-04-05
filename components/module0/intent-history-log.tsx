'use client'

import { useState } from 'react'
import type { IntentHistoryEntry } from '@/lib/types'

interface Props {
  history: IntentHistoryEntry[]
}

export function IntentHistoryLog({ history }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (history.length === 0) return null

  const visible = expanded ? history : history.slice(0, 3)

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-[11px] font-medium text-zinc-500">
          Research Intent 변경 이력 ({history.length}건)
        </span>
        <span className="text-zinc-700 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-zinc-800/60">
          {visible.map((entry, i) => (
            <div key={i} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <span>{new Date(entry.changed_at).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}</span>
                {entry.note && (
                  <span className="text-amber-600/80 italic">— {entry.note}</span>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start text-xs">
                <div className="rounded bg-zinc-800/60 px-2 py-1.5 text-zinc-500 leading-snug line-clamp-3">
                  {entry.old_intent ?? '(없음)'}
                </div>
                <span className="text-zinc-700 mt-1">→</span>
                <div className="rounded bg-zinc-800/80 px-2 py-1.5 text-zinc-300 leading-snug line-clamp-3">
                  {entry.new_intent ?? '(없음)'}
                </div>
              </div>
            </div>
          ))}
          {history.length > 3 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full py-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {history.length - 3}건 더 보기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
