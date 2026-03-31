'use client'

import { useState, useTransition } from 'react'
import { createProject, updateProject } from '@/lib/actions/projects'
import type { Project, ProjectInput, ProjectStatus } from '@/lib/types'

interface Props {
  project?: Project
  onSuccess?: (project: Project) => void
  onCancel?: () => void
}

export function ProjectForm({ project, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(project?.tags ?? [])

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags((prev) => [...new Set([...prev, tagInput.trim()])])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input: ProjectInput = {
      name:            fd.get('name') as string,
      description:     (fd.get('description') as string) || undefined,
      research_intent: (fd.get('research_intent') as string) || undefined,
      status:          (fd.get('status') as ProjectStatus) || 'active',
      tags,
    }

    startTransition(async () => {
      const result = project
        ? await updateProject(project.id, input)
        : await createProject(input)

      if (!result.success) { setError(result.error); return }
      onSuccess?.(result.data)
    })
  }

  const fieldCls = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">프로젝트 이름 *</label>
        <input
          name="name"
          defaultValue={project?.name}
          required
          placeholder="예: AI × 분석화학 융합 연구"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">연구 의도 (Research Intent)</label>
        <textarea
          name="research_intent"
          defaultValue={project?.research_intent ?? ''}
          rows={3}
          placeholder="이 프로젝트에서 탐구하려는 핵심 질문이나 가설을 설명하세요"
          className={`${fieldCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">설명</label>
        <textarea
          name="description"
          defaultValue={project?.description ?? ''}
          rows={2}
          placeholder="프로젝트 개요, 배경, 기대 성과 등"
          className={`${fieldCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
        <select
          name="status"
          defaultValue={project?.status ?? 'active'}
          className={fieldCls}
        >
          <option value="active">진행중</option>
          <option value="paused">일시정지</option>
          <option value="completed">완료</option>
          <option value="archived">보관됨</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">태그</label>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Enter를 눌러 태그 추가"
          className={fieldCls}
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-zinc-200">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? '저장 중…' : project ? '프로젝트 수정' : '프로젝트 만들기'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
