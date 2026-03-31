'use client'

import { useState } from 'react'
import { TrackForm } from './track-form'
import type { Track } from '@/lib/types'

interface Props {
  track?: Track
  projectId?: string | null
  siblingTracks?: Pick<Track, 'id' | 'name'>[]
  trigger: React.ReactNode
}

export function TrackDialog({ track, projectId, siblingTracks, trigger }: Props) {
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
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">
              {track ? '트랙 수정' : '새 트랙'}
            </h2>
            <TrackForm
              track={track}
              projectId={projectId}
              siblingTracks={siblingTracks}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
