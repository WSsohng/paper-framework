'use client'

import { useState, useTransition } from 'react'
import { createDraft, updateDraft } from '@/lib/actions/drafts'
import type { Draft, DraftInput, DraftStatus, Track, Journal } from '@/lib/types'

const STATUS_OPTIONS: { value: DraftStatus; label: string }[] = [
  { value: 'outline',   label: '개요' },
  { value: 'drafting',  label: '초고작성' },
  { value: 'revising',  label: '수정중' },
  { value: 'ready',     label: '제출준비' },
  { value: 'submitted', label: '제출됨' },
]

interface Props {
  draft?: Draft
  tracks?: Pick<Track, 'id' | 'name'>[]
  journals?: Pick<Journal, 'id' | 'name'>[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function DraftForm({ draft, tracks = [], journals = [], onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(draft?.tags ?? [])

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
    const wcRaw = fd.get('word_count') as string
    const input: DraftInput = {
      track_id:   (fd.get('track_id') as string) || null,
      journal_id: (fd.get('journal_id') as string) || null,
      title:      fd.get('title') as string,
      abstract:   (fd.get('abstract') as string) || undefined,
      status:     (fd.get('status') as DraftStatus) || 'outline',
      word_count: wcRaw ? parseInt(wcRaw) : undefined,
      notes:      (fd.get('notes') as string) || undefined,
      tags,
    }
    startTransition(async () => {
      const result = draft ? await updateDraft(draft.id, input) : await createDraft(input)
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
        <input name="title" defaultValue={draft?.title} required placeholder="논문 작업 제목" className={f} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select name="status" defaultValue={draft?.status ?? 'outline'} className={f}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">단어 수</label>
          <input name="word_count" type="number" min="0" defaultValue={draft?.word_count ?? ''} placeholder="예: 4500" className={f} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">트랙</label>
          <select name="track_id" defaultValue={draft?.track_id ?? ''} className={f}>
            <option value="">— 트랙 없음 —</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">목표 저널</label>
          <select name="journal_id" defaultValue={draft?.journal_id ?? ''} className={f}>
            <option value="">— 저널 없음 —</option>
            {journals.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Abstract</label>
        <textarea name="abstract" defaultValue={draft?.abstract ?? ''} rows={4} placeholder="논문 Abstract…" className={`${f} resize-none`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
        <textarea name="notes" defaultValue={draft?.notes ?? ''} rows={2} placeholder="초고에 대한 내부 메모" className={`${f} resize-none`} />
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
          {isPending ? '저장 중…' : draft ? '초고 수정' : '초고 만들기'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>}
      </div>
    </form>
  )
}
