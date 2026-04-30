'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreProject, deleteProject } from '@/lib/actions/projects'
import type { Project } from '@/lib/types'

interface Props {
  projects: Project[]
}

export function ArchivedProjectList({ projects }: Props) {
  return (
    <ul className="space-y-2">
      {projects.map((p) => (
        <ArchivedRow key={p.id} project={p} />
      ))}
    </ul>
  )
}

function ArchivedRow({ project }: { project: Project }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const r = await restoreProject(project.id)
      if (!r.success) setError(r.error ?? '복구 실패')
      else router.refresh()
    })
  }

  function handleDelete() {
    if (typed !== project.name) return
    setError(null)
    startTransition(async () => {
      const r = await deleteProject(project.id)
      if (!r.success) setError(r.error ?? '삭제 실패')
      else router.refresh()
    })
  }

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200 truncate">{project.name}</p>
          {project.research_intent && (
            <p className="mt-1 text-xs text-zinc-500 leading-snug line-clamp-2">
              {project.research_intent}
            </p>
          )}
          <p className="mt-1 text-[10px] text-zinc-600">
            보관일: {new Date(project.updated_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleRestore}
            disabled={pending || confirmOpen}
            className="rounded-md border border-emerald-700/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40 transition-colors"
          >
            복구
          </button>
          <button
            onClick={() => { setConfirmOpen((v) => !v); setTyped(''); setError(null) }}
            disabled={pending}
            className="rounded-md border border-rose-800/60 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/40 disabled:opacity-40 transition-colors"
          >
            영구 삭제
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="mt-3 space-y-2 rounded border border-rose-800/40 bg-rose-950/20 px-3 py-3">
          <p className="text-xs text-rose-200 leading-snug">
            영구 삭제하려면 프로젝트 이름을 정확히 입력하세요. 트랙·논문·발굴 기록이 모두 사라지며 <strong>복구할 수 없습니다</strong>.
          </p>
          <p className="text-[11px] text-rose-300/80">
            확인용: <code className="rounded bg-rose-950/60 px-1.5 py-0.5 font-mono">{project.name}</code>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="프로젝트 이름 입력"
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-rose-600"
              disabled={pending}
            />
            <button
              onClick={handleDelete}
              disabled={typed !== project.name || pending}
              className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-30 transition-colors"
            >
              {pending ? '삭제 중…' : '영구 삭제'}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-400">⚠ {error}</p>
      )}
    </li>
  )
}
