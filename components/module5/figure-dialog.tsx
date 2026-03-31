'use client'

import { useState } from 'react'
import { FigureForm } from './figure-form'
import type { Figure, Track, Draft } from '@/lib/types'

interface Props {
  figure?: Figure
  tracks?: Pick<Track, 'id' | 'name'>[]
  drafts?: Pick<Draft, 'id' | 'title'>[]
  trigger: React.ReactNode
}

export function FigureDialog({ figure, tracks, drafts, trigger }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">{figure ? '그림 수정' : '그림 추가'}</h2>
            <FigureForm figure={figure} tracks={tracks} drafts={drafts} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
