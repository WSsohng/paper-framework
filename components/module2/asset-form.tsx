'use client'

import { useState, useTransition } from 'react'
import { createAsset, updateAsset } from '@/lib/actions/assets'
import type { Asset, AssetInput, AssetType } from '@/lib/types'

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'quote',     label: '인용' },
  { value: 'figure',   label: '그림' },
  { value: 'table',    label: '표' },
  { value: 'data',     label: '데이터' },
  { value: 'reference',label: '참고문헌' },
  { value: 'note',     label: '메모' },
]

interface Props {
  asset?: Asset
  projectId?: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AssetForm({ asset, projectId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(asset?.tags ?? [])

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
    const input: AssetInput = {
      project_id: projectId ?? asset?.project_id ?? null,
      type:       (fd.get('type') as AssetType) || 'note',
      title:      fd.get('title') as string,
      content:    (fd.get('content') as string) || undefined,
      source:     (fd.get('source') as string) || undefined,
      tags,
    }
    startTransition(async () => {
      const result = asset ? await updateAsset(asset.id, input) : await createAsset(input)
      if (!result.success) { setError(result.error); return }
      onSuccess?.()
    })
  }

  const f = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">유형</label>
        <select name="type" defaultValue={asset?.type ?? 'note'} className={f}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">제목 *</label>
        <input name="title" defaultValue={asset?.title} required placeholder="자산 제목" className={f} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">내용</label>
        <textarea name="content" defaultValue={asset?.content ?? ''} rows={4} placeholder="인용구, 설명, 또는 데이터를 붙여넣으세요…" className={`${f} resize-none`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">출처</label>
        <input name="source" defaultValue={asset?.source ?? ''} placeholder="예: Smith et al. (2023), p.42" className={f} />
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
          {isPending ? '저장 중…' : asset ? '자산 수정' : '자산 추가'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>}
      </div>
    </form>
  )
}
