'use client'

import { useState, useTransition } from 'react'
import { createProject, updateProject } from '@/lib/actions/projects'
import { IntentHistoryLog } from '@/components/module0/intent-history-log'
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
  // intent 변경 감지: 현재 입력값이 원본과 다른지 실시간 추적
  const [currentIntent, setCurrentIntent] = useState(project?.research_intent ?? '')
  const intentChanged = project != null &&
    currentIntent.trim() !== (project.research_intent ?? '').trim() &&
    currentIntent.trim() !== ''

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
    const input: ProjectInput & { intent_note?: string } = {
      name:            fd.get('name') as string,
      description:     (fd.get('description') as string) || undefined,
      research_intent: (fd.get('research_intent') as string) || undefined,
      status:          (fd.get('status') as ProjectStatus) || 'active',
      tags,
      intent_note:     (fd.get('intent_note') as string) || undefined,
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
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-zinc-400">
            연구 의도 (Research Intent)
          </label>
          <span className="rounded-full bg-indigo-950 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-800/50">
            ✦ AI 핵심 입력값
          </span>
        </div>
        <textarea
          name="research_intent"
          value={currentIntent}
          onChange={(e) => setCurrentIntent(e.target.value)}
          rows={3}
          placeholder="예: NIR 분광기와 딥러닝을 결합해 소량 샘플로도 고정밀 화학 성분 분류가 가능한지 검증한다"
          className={`${fieldCls} resize-none`}
        />
        <p className="mt-1 text-[11px] text-zinc-600 leading-relaxed">
          M0 문헌 탐색 · M1 저널 추천 · M2 인사이트 추출 등 모든 AI 기능의 기반입니다. 구체적일수록 정확도가 높아집니다.
        </p>

        {/* 변경 이력 (편집 모드일 때만) */}
        {project && <IntentHistoryLog history={project.intent_history ?? []} />}

        {/* 변경 이유 입력 (intent가 달라졌을 때만 표시) */}
        {intentChanged && (
          <div className="mt-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2.5 space-y-2">
            <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
              <span>⚠</span>
              Research Intent가 변경됩니다. 저장 후 AI 분석값(논문 관련도·우선순위) 재계산을 권장합니다.
            </p>
            <input
              name="intent_note"
              placeholder="변경 이유 (선택) — 예: 실험 결과 방향 수정, 새 논문 발견 후 초점 이동"
              className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-amber-600 focus:outline-none"
            />
          </div>
        )}
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
