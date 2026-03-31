'use client'

import { useState } from 'react'
import { PaperForm } from './paper-form'
import type { Paper, Track } from '@/lib/types'

interface Props {
  paper?: Paper
  tracks?: Pick<Track, 'id' | 'name'>[]
  trackId?: string
  trigger: React.ReactNode
}

export function PaperDialog({ paper, tracks, trackId, trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">
              {paper ? '논문 수정' : '논문 추가'}
            </h2>
            <PaperForm
              paper={paper}
              tracks={tracks}
              defaultTrackId={trackId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
