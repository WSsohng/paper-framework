'use client'

import { useState } from 'react'
import { ReviewForm } from './review-form'
import type { Review, Draft, Track } from '@/lib/types'

interface Props {
  review?: Review
  drafts?: Pick<Draft, 'id' | 'title'>[]
  tracks?: Pick<Track, 'id' | 'name'>[]
  defaultDraftId?: string
  trigger: React.ReactNode
}

export function ReviewDialog({ review, drafts, tracks, defaultDraftId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">{review ? '리뷰 수정' : '리뷰 코멘트 추가'}</h2>
            <ReviewForm review={review} drafts={drafts} tracks={tracks} defaultDraftId={defaultDraftId} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
