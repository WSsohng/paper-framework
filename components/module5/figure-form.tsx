'use client'

import { useState, useTransition } from 'react'
import { createFigure, updateFigure } from '@/lib/actions/figures'
import type { Figure, FigureInput, FigureType, FigureStatus, Track, Draft } from '@/lib/types'

const TYPE_OPTIONS: { value: FigureType; label: string }[] = [
  { value: 'chart',   label: '차트' },
  { value: 'graph',   label: '그래프' },
  { value: 'diagram', label: '다이어그램' },
  { value: 'table',   label: '표' },
  { value: 'image',   label: '이미지' },
  { value: 'other',   label: '기타' },
]

const STATUS_OPTIONS: { value: FigureStatus; label: string }[] = [
  { value: 'planned', label: '계획됨' },
  { value: 'draft',   label: '초안' },
  { value: 'final',   label: '최종본' },
]

interface Props {
  figure?: Figure
  tracks?: Pick<Track, 'id' | 'name'>[]
  drafts?: Pick<Draft, 'id' | 'title'>[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function FigureForm({ figure, tracks = [], drafts = [], onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(figure?.tags ?? [])

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags((p) => [...new Set([...p, tagInput.trim()])])
      setTagInput('')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input: FigureInput = {
      track_id:    (fd.get('track_id') as string) || null,
      draft_id:    (fd.get('draft_id') as string) || null,
      title:       fd.get('title') as string,
      type:        (fd.get('type') as FigureType) || 'chart',
      caption:     (fd.get('caption') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      file_url:    (fd.get('file_url') as string) || undefined,
      status:      (fd.get('status') as FigureStatus) || 'planned',
      tags,
    }
    startTransition(async () => {
      const result = figure ? await updateFigure(figure.id, input) : await createFigure(input)
      if (!result.success) { setError(result.error); return }
      onSuccess?.()
    })
  }

  const f = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">제목 *</label>
        <input name="title" defaultValue={figure?.title} required placeholder="예: Figure 1: 성능 비교" className={f} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">유형</label>
          <select name="type" defaultValue={figure?.type ?? 'chart'} className={f}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select name="status" defaultValue={figure?.status ?? 'planned'} className={f}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">트랙</label>
          <select name="track_id" defaultValue={figure?.track_id ?? ''} className={f}>
            <option value="">— 없음 —</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {drafts.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">연결된 초고</label>
          <select name="draft_id" defaultValue={figure?.draft_id ?? ''} className={f}>
            <option value="">— 초고 없음 —</option>
            {drafts.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Caption (캡션)</label>
        <input name="caption" defaultValue={figure?.caption ?? ''} placeholder="논문에 들어갈 그림 설명" className={f} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">설명 / 메모</label>
        <textarea name="description" defaultValue={figure?.description ?? ''} rows={2} placeholder="이 그림이 무엇을 보여줘야 하나요?" className={`${f} resize-none`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">파일 URL</label>
        <input name="file_url" defaultValue={figure?.file_url ?? ''} placeholder="https://..." className={f} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">태그</label>
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Enter를 눌러 태그 추가" className={f} />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {tag}<button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="hover:text-zinc-200">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={isPending} className="flex-1 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {isPending ? '저장 중…' : figure ? '그림 수정' : '그림 추가'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>}
      </div>
    </form>
  )
}
