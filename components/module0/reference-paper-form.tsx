'use client'

import { useState, useTransition } from 'react'
import { createReferencePaper, updateReferencePaper } from '@/lib/actions/reference-papers'
import type { ReferencePaper, ReferencePaperInput, PaperStatus } from '@/lib/types'

interface Props {
  paper?: ReferencePaper
  projectId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReferencePaperForm({ paper, projectId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(paper?.tags ?? [])

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
    const authorsRaw = (fd.get('authors') as string).trim()
    const input: ReferencePaperInput = {
      project_id: projectId,
      title:    fd.get('title') as string,
      authors:  authorsRaw ? authorsRaw.split(',').map((a) => a.trim()) : [],
      journal:  (fd.get('journal') as string) || undefined,
      year:     fd.get('year') ? Number(fd.get('year')) : undefined,
      doi:      (fd.get('doi') as string) || undefined,
      abstract: (fd.get('abstract') as string) || undefined,
      notes:    (fd.get('notes') as string) || undefined,
      status:   (fd.get('status') as PaperStatus) || 'unread',
      tags,
    }

    startTransition(async () => {
      const result = paper
        ? await updateReferencePaper(paper.id, input)
        : await createReferencePaper(input)

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
        <label className="block text-xs font-medium text-zinc-400 mb-1">제목 *</label>
        <input
          name="title"
          defaultValue={paper?.title}
          required
          placeholder="논문 제목"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">저자 (쉼표로 구분)</label>
        <input
          name="authors"
          defaultValue={paper?.authors.join(', ')}
          placeholder="Kim J., Lee S., Park H."
          className={fieldCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">저널</label>
          <input
            name="journal"
            defaultValue={paper?.journal ?? ''}
            placeholder="Nature, Science, ..."
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">출판 연도</label>
          <input
            name="year"
            type="number"
            defaultValue={paper?.year ?? ''}
            placeholder="2024"
            min={1900}
            max={2100}
            className={fieldCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">DOI</label>
        <input
          name="doi"
          defaultValue={paper?.doi ?? ''}
          placeholder="10.xxxx/xxxxx"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Abstract</label>
        <textarea
          name="abstract"
          defaultValue={paper?.abstract ?? ''}
          rows={3}
          placeholder="논문 초록"
          className={`${fieldCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
        <textarea
          name="notes"
          defaultValue={paper?.notes ?? ''}
          rows={2}
          placeholder="이 논문에 대한 개인 메모"
          className={`${fieldCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
        <select name="status" defaultValue={paper?.status ?? 'unread'} className={fieldCls}>
          <option value="unread">미읽음</option>
          <option value="reading">읽는중</option>
          <option value="read">읽음</option>
          <option value="key">핵심</option>
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
          {isPending ? '저장 중…' : paper ? '논문 수정' : '논문 추가'}
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
