'use client'

import { useState, useTransition } from 'react'
import { createJournal, updateJournal } from '@/lib/actions/journals'
import type { Journal, JournalInput, JournalStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: JournalStatus; label: string }[] = [
  { value: 'considering', label: '검토중' },
  { value: 'shortlisted', label: '후보' },
  { value: 'submitted',   label: '제출됨' },
  { value: 'accepted',    label: '게재승인' },
  { value: 'rejected',    label: '게재거절' },
  { value: 'withdrawn',   label: '취하됨' },
]

interface Props {
  journal?: Journal
  projectId?: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function JournalForm({ journal, projectId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(journal?.tags ?? [])

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

    const ifRaw = fd.get('impact_factor') as string
    const input: JournalInput = {
      project_id:     projectId ?? journal?.project_id ?? null,
      name:           fd.get('name') as string,
      publisher:      (fd.get('publisher') as string) || undefined,
      issn:           (fd.get('issn') as string) || undefined,
      impact_factor:  ifRaw ? parseFloat(ifRaw) : undefined,
      scope:          (fd.get('scope') as string) || undefined,
      website:        (fd.get('website') as string) || undefined,
      submission_url: (fd.get('submission_url') as string) || undefined,
      status:         (fd.get('status') as JournalStatus) || 'considering',
      notes:          (fd.get('notes') as string) || undefined,
      tags,
    }

    startTransition(async () => {
      const result = journal
        ? await updateJournal(journal.id, input)
        : await createJournal(input)

      if (!result.success) {
        setError(result.error)
        return
      }
      onSuccess?.()
    })
  }

  const fieldClass =
    'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">저널 이름 *</label>
        <input
          name="name"
          defaultValue={journal?.name}
          required
          placeholder="예: Nature Machine Intelligence"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">출판사</label>
          <input
            name="publisher"
            defaultValue={journal?.publisher ?? ''}
            placeholder="예: Springer"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">ISSN</label>
          <input
            name="issn"
            defaultValue={journal?.issn ?? ''}
            placeholder="e.g. 2522-5839"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Impact Factor (IF)</label>
          <input
            name="impact_factor"
            type="number"
            step="0.001"
            min="0"
            defaultValue={journal?.impact_factor ?? ''}
            placeholder="e.g. 25.898"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select
            name="status"
            defaultValue={journal?.status ?? 'considering'}
            className={fieldClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Scope (게재 범위)</label>
        <textarea
          name="scope"
          defaultValue={journal?.scope ?? ''}
          rows={2}
          placeholder="이 저널이 다루는 주제는?"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">웹사이트</label>
          <input
            name="website"
            defaultValue={journal?.website ?? ''}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">투고 URL</label>
          <input
            name="submission_url"
            defaultValue={journal?.submission_url ?? ''}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
        <textarea
          name="notes"
          defaultValue={journal?.notes ?? ''}
          rows={2}
          placeholder="예: 심사 기간 약 3개월, 짧은 논문 선호"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">태그</label>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Enter를 눌러 태그 추가"
          className={fieldClass}
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
          {isPending ? '저장 중…' : journal ? '저널 수정' : '저널 추가'}
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
