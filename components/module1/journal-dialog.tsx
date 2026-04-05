'use client'

import { useState } from 'react'
import { JournalForm } from './journal-form'
import type { Journal } from '@/lib/types'

interface Props {
  journal?:   Journal
  projectId?: string | null
  trigger:    React.ReactNode
  onDelete?:  () => void
}

export function JournalDialog({ journal, projectId, trigger, onDelete }: Props) {
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
              {journal ? '저널 수정' : '저널 추가'}
            </h2>
            <JournalForm
              journal={journal}
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
              onDelete={() => { setOpen(false); onDelete?.() }}
            />
          </div>
        </div>
      )}
    </>
  )
}
