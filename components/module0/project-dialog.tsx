'use client'

import { useState, useCallback } from 'react'
import { ProjectForm } from './project-form'
import type { Project } from '@/lib/types'

interface Props {
  project?: Project
  trigger?: React.ReactNode
  onSuccess?: (project: Project) => void
}

export function ProjectDialog({ project, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false)

  const handleSuccess = useCallback(
    (p: Project) => {
      setOpen(false)
      onSuccess?.(p)
    },
    [onSuccess],
  )

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <button className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
            + 새 프로젝트
          </button>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">
                {project ? '프로젝트 수정' : '새 프로젝트'}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <ProjectForm
              project={project}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
