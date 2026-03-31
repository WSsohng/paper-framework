'use client'

import { useState, useTransition } from 'react'
import { createReview, updateReview } from '@/lib/actions/reviews'
import type { Review, ReviewInput, ReviewSeverity, ReviewCategory, Draft, Track } from '@/lib/types'

const SEVERITY_OPTIONS: { value: ReviewSeverity; label: string }[] = [
  { value: 'minor',    label: '경미' },
  { value: 'major',    label: '주요' },
  { value: 'critical', label: '심각' },
]

const CATEGORY_OPTIONS: { value: ReviewCategory; label: string }[] = [
  { value: 'methodology', label: '방법론' },
  { value: 'clarity',     label: '명확성' },
  { value: 'novelty',     label: '신규성' },
  { value: 'structure',   label: '구조' },
  { value: 'data',        label: '데이터' },
  { value: 'other',       label: '기타' },
]

interface Props {
  review?: Review
  drafts?: Pick<Draft, 'id' | 'title'>[]
  tracks?: Pick<Track, 'id' | 'name'>[]
  defaultDraftId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({ review, drafts = [], tracks = [], defaultDraftId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(review?.tags ?? [])

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
    const draftId = (fd.get('draft_id') as string) || defaultDraftId || ''
    const input: ReviewInput = {
      draft_id: draftId,
      track_id: (fd.get('track_id') as string) || null,
      persona:  (fd.get('persona') as string) || undefined,
      feedback: fd.get('feedback') as string,
      severity: (fd.get('severity') as ReviewSeverity) || 'minor',
      category: (fd.get('category') as ReviewCategory) || 'other',
      resolved: fd.get('resolved') === 'on',
      tags,
    }
    startTransition(async () => {
      const result = review ? await updateReview(review.id, input) : await createReview(input)
      if (!result.success) { setError(result.error); return }
      onSuccess?.()
    })
  }

  const f = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}

      {drafts.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">초고 *</label>
          <select name="draft_id" defaultValue={review?.draft_id ?? defaultDraftId ?? ''} required className={f}>
            <option value="">— 초고 선택 —</option>
            {drafts.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">심각도</label>
          <select name="severity" defaultValue={review?.severity ?? 'minor'} className={f}>
            {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">분류</label>
          <select name="category" defaultValue={review?.category ?? 'other'} className={f}>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">리뷰어 페르소나</label>
        <input name="persona" defaultValue={review?.persona ?? ''} placeholder="예: 통계 전문가, 도메인 전문가" className={f} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">피드백 *</label>
        <textarea name="feedback" defaultValue={review?.feedback} required rows={4} placeholder="리뷰 코멘트나 비판 내용을 작성하세요…" className={`${f} resize-none`} />
      </div>

      {tracks.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">트랙</label>
          <select name="track_id" defaultValue={review?.track_id ?? ''} className={f}>
            <option value="">— 트랙 없음 —</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="checkbox" name="resolved" id="resolved" defaultChecked={review?.resolved ?? false} className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-500" />
        <label htmlFor="resolved" className="text-sm text-zinc-400">해결됨으로 표시</label>
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
          {isPending ? '저장 중…' : review ? '리뷰 수정' : '리뷰 추가'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>}
      </div>
    </form>
  )
}
