'use client'

import { useTransition } from 'react'
import { updateReferencePaper } from '@/lib/actions/reference-papers'
import type { PaperTier } from '@/lib/types'

interface Props {
  paperId:     string
  currentTier: PaperTier | null
}

const TIERS: { value: PaperTier; label: string; desc: string; cls: string }[] = [
  { value: 1, label: 'T1', desc: '경쟁 논문',    cls: 'border-red-700 text-red-400 bg-red-950/40'    },
  { value: 2, label: 'T2', desc: '핵심 근거',    cls: 'border-amber-700 text-amber-400 bg-amber-950/40' },
  { value: 3, label: 'T3', desc: '거시적 흐름',  cls: 'border-zinc-600 text-zinc-400 bg-zinc-800/40'  },
]

export function TierSelector({ paperId, currentTier }: Props) {
  const [pending, startTransition] = useTransition()

  const setTier = (tier: PaperTier | null) => {
    startTransition(async () => {
      await updateReferencePaper(paperId, { tier: tier ?? undefined })
    })
  }

  return (
    <div className="flex items-center gap-1">
      {TIERS.map((t) => (
        <button
          key={t.value}
          onClick={(e) => {
            e.preventDefault()
            setTier(currentTier === t.value ? null : t.value)
          }}
          disabled={pending}
          title={t.desc}
          className={`rounded border px-1.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-40 ${
            currentTier === t.value
              ? t.cls
              : 'border-zinc-700 text-zinc-600 bg-transparent hover:border-zinc-500 hover:text-zinc-400'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
