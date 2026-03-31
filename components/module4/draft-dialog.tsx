'use client'

import { useState } from 'react'
import { DraftForm } from './draft-form'
import type { Draft, Track, Journal } from '@/lib/types'

interface Props {
  draft?: Draft
  tracks?: Pick<Track, 'id' | 'name'>[]
  journals?: Pick<Journal, 'id' | 'name'>[]
  trigger: React.ReactNode
}

export function DraftDialog({ draft, tracks, journals, trigger }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">{draft ? '초고 수정' : '새 초고'}</h2>
            <DraftForm draft={draft} tracks={tracks} journals={journals} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
