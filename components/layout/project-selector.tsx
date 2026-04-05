'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSelectedProject } from '@/lib/actions/project-context'
import { setSelectedTrack } from '@/lib/actions/track-context'
import { ProjectDialog } from '@/components/module0/project-dialog'
import type { Project } from '@/lib/types'

interface Props {
  projects: Project[]
  selectedProject: Project | null
}

export function ProjectSelector({ projects, selectedProject }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectProject(id: string) {
    setOpen(false)
    startTransition(async () => {
      await setSelectedProject(id)
      // 프로젝트가 바뀌면 트랙은 해당 프로젝트 소속이 아니므로 초기화
      if (id !== selectedProject?.id) {
        await setSelectedTrack(null)
      }
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
      >
        <div className="min-w-0 flex-1">
          {selectedProject ? (
            <>
              <p className="truncate text-xs font-semibold text-zinc-100 leading-tight">
                {selectedProject.name}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">현재 프로젝트</p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-zinc-400">프로젝트 없음</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">프로젝트를 선택하거나 생성하세요</p>
            </>
          )}
        </div>
        <span className="shrink-0 text-zinc-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
          {projects.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selectProject(p.id)}
                    className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
                      p.id === selectedProject?.id
                        ? 'bg-zinc-800 text-indigo-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    <p className="truncate text-xs font-medium">{p.name}</p>
                    {p.research_intent && (
                      <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                        {p.research_intent}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-xs text-zinc-600">프로젝트가 없습니다</p>
          )}
          <div className="border-t border-zinc-800 p-2">
            <ProjectDialog
              onSuccess={(project) => {
                setOpen(false)
                selectProject(project.id)
              }}
              trigger={
                <button className="w-full rounded-md px-3 py-2 text-left text-xs font-medium text-indigo-400 hover:bg-zinc-800 transition-colors">
                  + 새 프로젝트
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
