'use client'

import { useState, useTransition } from 'react'
import { createTrack, updateTrack } from '@/lib/actions/tracks'
import type { Track, TrackInput, TrackRelation, TrackStatus } from '@/lib/types'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
]

interface Props {
  track?: Track
  projectId?: string | null
  siblingTracks?: Pick<Track, 'id' | 'name'>[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function TrackForm({ track, projectId, siblingTracks = [], onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(track?.color ?? COLORS[0])
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(track?.tags ?? [])

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
    const input: TrackInput = {
      project_id:      projectId ?? track?.project_id ?? null,
      parent_track_id: (fd.get('parent_track_id') as string) || null,
      relation_type:   (fd.get('relation_type') as TrackRelation) || 'parallel',
      name:            fd.get('name') as string,
      description:     (fd.get('description') as string) || undefined,
      research_intent: (fd.get('research_intent') as string) || undefined,
      color,
      status:          (fd.get('status') as TrackStatus) || 'active',
      tags,
    }

    startTransition(async () => {
      const result = track
        ? await updateTrack(track.id, input)
        : await createTrack(input)

      if (!result.success) { setError(result.error); return }
      onSuccess?.()
    })
  }

  const fieldCls = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">트랙 이름 *</label>
        <input
          name="name"
          defaultValue={track?.name}
          required
          placeholder="예: Foundation Model → NIR 적용"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">연구 의도</label>
        <textarea
          name="research_intent"
          defaultValue={track?.research_intent ?? ''}
          rows={2}
          placeholder="이 트랙에서 검증하거나 탐구하려는 핵심 질문"
          className={`${fieldCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">설명</label>
        <textarea
          name="description"
          defaultValue={track?.description ?? ''}
          rows={2}
          placeholder="연구 접근법, 방법론, 기대 결과 등"
          className={`${fieldCls} resize-none`}
        />
      </div>

      {siblingTracks.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">상위 트랙 (선택)</label>
            <select
              name="parent_track_id"
              defaultValue={track?.parent_track_id ?? ''}
              className={fieldCls}
            >
              <option value="">없음 (독립 트랙)</option>
              {siblingTracks
                .filter((t) => t.id !== track?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">진행 방식</label>
            <select
              name="relation_type"
              defaultValue={track?.relation_type ?? 'parallel'}
              className={fieldCls}
            >
              <option value="parallel">병렬 (동시 진행)</option>
              <option value="sequential">순차 (후속 연구)</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
        <select
          name="status"
          defaultValue={track?.status ?? 'active'}
          className={fieldCls}
        >
          <option value="active">활성</option>
          <option value="paused">일시정지</option>
          <option value="archived">보관됨</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">색상</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
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
          {isPending ? '저장 중…' : track ? '트랙 수정' : '트랙 만들기'}
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
