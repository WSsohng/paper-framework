'use client'

import { useState, useTransition } from 'react'
import { createAsset, updateAsset } from '@/lib/actions/assets'
import type { Asset, AssetInput, AssetType, AssetSection, ReferencePaper } from '@/lib/types'
import { ASSET_SECTION_LABELS } from '@/lib/types'

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'quote',     label: '인용구' },
  { value: 'figure',   label: '그림'   },
  { value: 'table',    label: '표'     },
  { value: 'data',     label: '데이터' },
  { value: 'reference',label: '참고문헌' },
  { value: 'note',     label: '메모'   },
  { value: 'idea',     label: '아이디어' },
]

const SECTION_OPTIONS: { value: AssetSection; label: string }[] = (
  Object.entries(ASSET_SECTION_LABELS) as [AssetSection, string][]
).map(([value, label]) => ({ value, label }))

interface Props {
  asset?:          Asset
  projectId?:      string | null
  /** 이 프로젝트의 참고문헌 목록 — 출처 연결 선택에 사용 */
  referencePapers?: Pick<ReferencePaper, 'id' | 'title' | 'year' | 'tier'>[]
  onSuccess?:      () => void
  onCancel?:       () => void
}

export function AssetForm({ asset, projectId, referencePapers = [], onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]     = useState<string[]>(asset?.tags ?? [])
  const [refPaperId, setRefPaperId] = useState<string>(asset?.reference_paper_id ?? '')
  const [section, setSection]       = useState<string>(asset?.paper_section ?? '')

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
      project_id:         projectId ?? asset?.project_id ?? null,
      type:               (fd.get('type') as AssetType) || 'note',
      title:              fd.get('title') as string,
      content:            (fd.get('content') as string)  || undefined,
      source:             (fd.get('source') as string)   || undefined,
      reference_paper_id: refPaperId || null,
      paper_section:      (section as AssetSection)       || null,
      tags,
    }
    startTransition(async () => {
      const result = asset ? await updateAsset(asset.id, input) : await createAsset(input)
      if (!result.success) { setError(result.error); return }
      onSuccess?.()
    })
  }

  const f = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none'

  const tierLabel: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}

      {/* 유형 */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">유형</label>
        <select name="type" defaultValue={asset?.type ?? 'note'} className={f}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* 제목 */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">제목 *</label>
        <input name="title" defaultValue={asset?.title} required placeholder="자산 제목" className={f} />
      </div>

      {/* 내용 */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">내용</label>
        <textarea
          name="content"
          defaultValue={asset?.content ?? ''}
          rows={4}
          placeholder="인용구, 설명, 또는 데이터를 붙여넣으세요…"
          className={`${f} resize-none`}
        />
      </div>

      {/* 출처 (직접 입력) */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">출처 텍스트</label>
        <input
          name="source"
          defaultValue={asset?.source ?? ''}
          placeholder="예: Smith et al. (2023), p.42"
          className={f}
        />
      </div>

      {/* 참고문헌 연결 + 논문 섹션 */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-3">
        <p className="text-xs font-medium text-zinc-400">참고문헌 연결 <span className="font-normal text-zinc-600">— 이 자산이 어떤 논문에서 나왔는지 연결합니다</span></p>

        <div>
          <label className="block text-[11px] text-zinc-600 mb-1">출처 논문 (선택)</label>
          <select
            value={refPaperId}
            onChange={(e) => setRefPaperId(e.target.value)}
            className={f}
          >
            <option value="">— 연결 안 함</option>
            {referencePapers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tier ? `[${tierLabel[p.tier]}] ` : ''}{p.title}{p.year ? ` (${p.year})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-zinc-600 mb-1">사용할 논문 섹션 (선택)</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className={f}
          >
            <option value="">— 미지정</option>
            {SECTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 태그 */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">태그</label>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Enter를 눌러 태그 추가"
          className={f}
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {tag}
                <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="hover:text-zinc-200">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 저장 */}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={isPending} className="flex-1 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {isPending ? '저장 중…' : asset ? '자산 수정' : '자산 추가'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>
        )}
      </div>
    </form>
  )
}
