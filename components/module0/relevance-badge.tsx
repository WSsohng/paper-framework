'use client'

import type { RelevanceLevel } from '@/lib/types'

interface Props {
  level: RelevanceLevel
  reason?: string | null
  size?: 'sm' | 'md'
}

const LEVEL_CONFIG: Record<RelevanceLevel, { label: string; desc: string; classes: string }> = {
  1: {
    label:   'R1',
    desc:    '핵심 연관',
    classes: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  },
  2: {
    label:   'R2',
    desc:    '부분 연관',
    classes: 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700',
  },
  3: {
    label:   'R3',
    desc:    '배경 연관',
    classes: 'bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-600',
  },
}

export function RelevanceBadge({ level, reason, size = 'sm' }: Props) {
  const cfg = LEVEL_CONFIG[level]

  return (
    <span
      title={reason ? `${cfg.desc}: ${reason}` : cfg.desc}
      className={`
        inline-flex items-center gap-1 font-mono font-semibold rounded
        ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}
        ${cfg.classes}
      `}
    >
      {cfg.label}
      <span className="font-sans font-normal opacity-75 hidden sm:inline">
        {cfg.desc}
      </span>
    </span>
  )
}
