'use client'

import { useState, useTransition } from 'react'
import { createPaper, updatePaper } from '@/lib/actions/papers'
import type { Paper, PaperInput, PaperStatus, Track } from '@/lib/types'

interface Props {
  paper?: Paper
  tracks?: Pick<Track, 'id' | 'name'>[]
  defaultTrackId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function PaperForm({ paper, tracks = [], defaultTrackId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [authorsInput, setAuthorsInput] = useState(paper?.authors.join(', ') ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const authors = authorsInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

    const yearStr = fd.get('year') as string
    const input: PaperInput = {
      track_id: (fd.get('track_id') as string) || undefined,
      title: fd.get('title') as string,
      authors,
      journal: (fd.get('journal') as string) || undefined,
      year: yearStr ? parseInt(yearStr) : undefined,
      doi: (fd.get('doi') as string) || undefined,
      abstract: (fd.get('abstract') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      status: (fd.get('status') as PaperStatus) || 'unread',
    }

    startTransition(async () => {
      const result = paper
        ? await updatePaper(paper.id, input)
        : await createPaper(input)

      if (!result.success) {
        setError(result.error)
        return
      }
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">제목 *</label>
        <input
          name="title"
          defaultValue={paper?.title}
          required
          placeholder="논문 전체 제목"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">저자</label>
        <input
          value={authorsInput}
          onChange={(e) => setAuthorsInput(e.target.value)}
          placeholder="저자 A, 저자 B, 저자 C"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">저널 / 학회</label>
          <input
            name="journal"
            defaultValue={paper?.journal ?? ''}
            placeholder="e.g. NeurIPS 2024"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">출판연도</label>
          <input
            name="year"
            type="number"
            defaultValue={paper?.year ?? ''}
            placeholder="2024"
            min={1900}
            max={2100}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">DOI</label>
        <input
          name="doi"
          defaultValue={paper?.doi ?? ''}
          placeholder="10.xxxx/xxxxx"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">트랙</label>
          <select
            name="track_id"
            defaultValue={paper?.track_id ?? defaultTrackId ?? ''}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">— 미지정 —</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select
            name="status"
            defaultValue={paper?.status ?? 'unread'}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="unread">미읽음</option>
            <option value="reading">읽는중</option>
            <option value="read">읽음</option>
            <option value="key">핵심</option>
            <option value="archived">보관됨</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Abstract</label>
        <textarea
          name="abstract"
          defaultValue={paper?.abstract ?? ''}
          rows={3}
          placeholder="Abstract를 붙여넣거나 요약 작성"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
        <textarea
          name="notes"
          defaultValue={paper?.notes ?? ''}
          rows={2}
          placeholder="개인 메모, 핵심 인사이트…"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none resize-none"
        />
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
