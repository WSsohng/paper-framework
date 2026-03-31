'use client'

import { useState, useCallback } from 'react'
import { ReferencePaperForm } from './reference-paper-form'
import type { ReferencePaper } from '@/lib/types'

interface Props {
  paper?: ReferencePaper
  projectId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ReferencePaperDialog({ paper, projectId, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false)

  const handleSuccess = useCallback(() => {
    setOpen(false)
    onSuccess?.()
  }, [onSuccess])

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <button className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
            + 논문 추가
          </button>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">
                {paper ? '참고문헌 수정' : '참고문헌 추가'}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <ReferencePaperForm
              paper={paper}
              projectId={projectId}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
