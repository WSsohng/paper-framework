'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { createJournal, updateJournal } from '@/lib/actions/journals'
import { lookupJournal, type JournalSuggestion } from '@/lib/actions/search/journal-lookup'
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
  journal?:   Journal
  projectId?: string | null
  onSuccess?: () => void
  onCancel?:  () => void
}

export function JournalForm({ journal, projectId, onSuccess, onCancel }: Props) {
  // ── form state ───────────────────────────────────────────
  const [name,          setName]          = useState(journal?.name           ?? '')
  const [publisher,     setPublisher]     = useState(journal?.publisher      ?? '')
  const [issn,          setIssn]          = useState(journal?.issn           ?? '')
  const [impactFactor,  setImpactFactor]  = useState(journal?.impact_factor?.toString() ?? '')
  const [scope,         setScope]         = useState(journal?.scope          ?? '')
  const [website,       setWebsite]       = useState(journal?.website        ?? '')
  const [submissionUrl, setSubmissionUrl] = useState(journal?.submission_url ?? '')
  const [status,        setStatus]        = useState<JournalStatus>(journal?.status ?? 'considering')
  const [notes,         setNotes]         = useState(journal?.notes          ?? '')
  const [tags,          setTags]          = useState<string[]>(journal?.tags ?? [])
  const [tagInput,      setTagInput]      = useState('')

  // ── autocomplete state ───────────────────────────────────
  const [suggestions,    setSuggestions]    = useState<JournalSuggestion[]>([])
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [lookupPending,  setLookupPending]  = useState(false)
  const [autofilled,     setAutofilled]     = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── submit ───────────────────────────────────────────────
  const [isPending, startTransition] = useTransition()
  const [error,     setError]         = useState<string | null>(null)

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── 저널명 입력 → debounce 검색 ──────────────────────────
  const handleNameChange = useCallback((value: string) => {
    setName(value)
    setAutofilled(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLookupPending(true)
      const result = await lookupJournal(value)
      setLookupPending(false)
      if (result.success && result.data.length > 0) {
        setSuggestions(result.data)
        setShowDropdown(true)
      } else {
        setSuggestions([])
        setShowDropdown(false)
      }
    }, 450)
  }, [])

  // ── 자동완성 항목 선택 ────────────────────────────────────
  function applySuggestion(s: JournalSuggestion) {
    setName(s.name)
    if (s.publisher)     setPublisher(s.publisher)
    if (s.issn)          setIssn(s.issn)
    if (s.impact_factor != null) setImpactFactor(s.impact_factor.toFixed(3))
    if (s.website)       setWebsite(s.website)
    setShowDropdown(false)
    setAutofilled(true)
  }

  // ── 태그 ─────────────────────────────────────────────────
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

  // ── 저장 ─────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input: JournalInput = {
      project_id:     projectId ?? journal?.project_id ?? null,
      name:           name.trim(),
      publisher:      publisher.trim() || undefined,
      issn:           issn.trim()      || undefined,
      impact_factor:  impactFactor     ? parseFloat(impactFactor) : undefined,
      scope:          scope.trim()     || undefined,
      website:        website.trim()   || undefined,
      submission_url: submissionUrl.trim() || undefined,
      status,
      notes:          notes.trim()     || undefined,
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

      {/* ── 저널 이름 (자동완성) ── */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          저널 이름 *
          <span className="ml-1.5 font-normal text-zinc-600">
            — 2글자 이상 입력하면 자동으로 검색됩니다
          </span>
        </label>
        <div className="relative">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            required
            placeholder="예: Nature Machine Intelligence"
            className={fieldClass}
            autoComplete="off"
          />
          {lookupPending && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-600 border-t-indigo-400 block" />
            </span>
          )}
          {autofilled && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-medium">
              ✓ 자동 입력됨
            </span>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion(s)}
                className="w-full px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800/60 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{s.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 truncate">
                      {s.publisher && <span>{s.publisher}</span>}
                      {s.issn && <span className="ml-1.5">· ISSN {s.issn}</span>}
                      {s.works_count != null && (
                        <span className="ml-1.5 text-zinc-700">· {s.works_count.toLocaleString()}편 게재</span>
                      )}
                    </p>
                  </div>
                  {s.impact_factor != null && (
                    <span className="shrink-0 rounded bg-amber-950 px-1.5 py-0.5 text-[11px] font-bold text-amber-400">
                      IF {s.impact_factor.toFixed(1)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            <div className="px-4 py-1.5 bg-zinc-950/60">
              <p className="text-[10px] text-zinc-700">출처: OpenAlex — 선택 후 수정 가능</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 출판사 / ISSN ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">출판사</label>
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="예: Springer"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">ISSN</label>
          <input
            value={issn}
            onChange={(e) => setIssn(e.target.value)}
            placeholder="e.g. 2522-5839"
            className={fieldClass}
          />
        </div>
      </div>

      {/* ── IF / 상태 ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Impact Factor (IF)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={impactFactor}
            onChange={(e) => setImpactFactor(e.target.value)}
            placeholder="e.g. 25.898"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JournalStatus)}
            className={fieldClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Scope ── */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Scope (게재 범위)</label>
        <textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          rows={2}
          placeholder="이 저널이 다루는 주제는?"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* ── 웹사이트 / 투고 URL ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">웹사이트</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">투고 URL</label>
          <input
            value={submissionUrl}
            onChange={(e) => setSubmissionUrl(e.target.value)}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
      </div>

      {/* ── 메모 ── */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="예: 심사 기간 약 3개월, 짧은 논문 선호"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* ── 태그 ── */}
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

      {/* ── 버튼 ── */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
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
