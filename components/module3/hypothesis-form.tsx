'use client'

import { useState, useTransition } from 'react'
import { createHypothesis, updateHypothesis } from '@/lib/actions/hypotheses'
import type { Hypothesis, HypothesisInput, HypothesisStatus, Track } from '@/lib/types'

const STATUS_OPTIONS: { value: HypothesisStatus; label: string }[] = [
  { value: 'draft',     label: '초안' },
  { value: 'active',    label: '활성' },
  { value: 'testing',   label: '검증중' },
  { value: 'confirmed', label: '확인됨' },
  { value: 'rejected',  label: '기각됨' },
]

interface Props {
  hypothesis?: Hypothesis
  tracks?: Pick<Track, 'id' | 'name'>[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function HypothesisForm({ hypothesis, tracks = [], onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(hypothesis?.tags ?? [])

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
    const input: HypothesisInput = {
      track_id:  (fd.get('track_id') as string) || null,
      title:     fd.get('title') as string,
      statement: (fd.get('statement') as string) || undefined,
      rationale: (fd.get('rationale') as string) || undefined,
      status:    (fd.get('status') as HypothesisStatus) || 'draft',
      tags,
    }
    startTransition(async () => {
      const result = hypothesis ? await updateHypothesis(hypothesis.id, input) : await createHypothesis(input)
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
        <input name="title" defaultValue={hypothesis?.title} required placeholder="가설의 짧은 이름" className={f} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select name="status" defaultValue={hypothesis?.status ?? 'draft'} className={f}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">트랙</label>
          <select name="track_id" defaultValue={hypothesis?.track_id ?? ''} className={f}>
            <option value="">— 트랙 없음 —</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">가설 진술</label>
        <textarea name="statement" defaultValue={hypothesis?.statement ?? ''} rows={3} placeholder="우리는 …라고 가설을 세운다." className={`${f} resize-none`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">근거 (Rationale)</label>
        <textarea name="rationale" defaultValue={hypothesis?.rationale ?? ''} rows={3} placeholder="왜 이를 믿는가?" className={`${f} resize-none`} />
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
          {isPending ? '저장 중…' : hypothesis ? '가설 수정' : '가설 만들기'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>}
      </div>
    </form>
  )
}
