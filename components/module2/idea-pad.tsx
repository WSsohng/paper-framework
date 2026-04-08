'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAsset, deleteAsset } from '@/lib/actions/assets'
import { AssetDialog } from '@/components/module2/asset-dialog'
import type { Asset } from '@/lib/types'

type PickedRef = { id: string; title: string; year: number | null; tier: import('@/lib/types').PaperTier | null }

interface Props {
  projectId:       string | null
  initialIdeas:    Asset[]
  refPaperPickList: PickedRef[]
}

export function IdeaPad({ projectId, initialIdeas, refPaperPickList }: Props) {
  const [text, setText]           = useState('')
  const [ideas, setIdeas]         = useState<Asset[]>(initialIdeas)
  const [collapsed, setCollapsed] = useState(false)
  const [isSaving, startSaving]   = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // 서버 재렌더링(router.refresh) 후 새 props 동기화
  useEffect(() => { setIdeas(initialIdeas) }, [initialIdeas])

  // textarea 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  function handleSave() {
    const trimmed = text.trim()
    if (!trimmed || !projectId) return

    const lines    = trimmed.split('\n')
    const title    = lines[0].slice(0, 80)
    const content  = lines.slice(1).join('\n').trim() || null

    startSaving(async () => {
      const result = await createAsset({
        project_id: projectId,
        type:       'idea',
        title,
        content:    content ?? undefined,
      })
      if (result.success && result.data) {
        setIdeas((prev) => [result.data!, ...prev])
        setText('')
        textareaRef.current?.focus()
      }
    })
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteAsset(id)
      if (result.success) {
        setIdeas((prev) => prev.filter((a) => a.id !== id))
      }
    })
  }

  function handleEditSuccess() {
    router.refresh()
  }

  const charCount = text.length
  const isEmpty   = text.trim().length === 0

  return (
    <div className="mx-8 mt-5 rounded-xl border border-purple-800/40 bg-purple-950/10">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-purple-800/30">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">✦</span>
          <p className="text-sm font-medium text-purple-300">아이디어 메모장</p>
          <span className="text-xs text-zinc-600">
            — 연구 관련 아이디어를 자유롭게 던져두세요
          </span>
          {ideas.length > 0 && (
            <span className="text-xs text-purple-600/70">{ideas.length}개</span>
          )}
        </div>
        {ideas.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {collapsed ? '펼치기 ▾' : '접기 ▴'}
          </button>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="px-5 py-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            '아이디어를 입력하세요. (Ctrl+Enter로 저장)\n\n예) 2D-correlation 수식을 NN 가중치 갱신에 적용하여 화학적 상관관계를 주입하면 어떨까?'
          }
          rows={3}
          disabled={!projectId || isSaving}
          className="w-full resize-none overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-purple-600/50 focus:outline-none focus:ring-1 focus:ring-purple-600/30 disabled:opacity-50 transition-colors"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-700">
            {charCount > 0 ? `${charCount}자 · 첫 줄이 제목으로 저장됩니다` : 'Ctrl+Enter로 빠른 저장'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty || !projectId || isSaving}
            className="flex items-center gap-1.5 rounded-md bg-purple-900/50 px-3 py-1.5 text-xs font-medium text-purple-300 ring-1 ring-purple-700/50 hover:bg-purple-900/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-purple-500 border-t-purple-200" />
                저장 중…
              </>
            ) : (
              '기록'
            )}
          </button>
        </div>
      </div>

      {/* 아이디어 목록 */}
      {!collapsed && ideas.length > 0 && (
        <div className="border-t border-purple-800/20 divide-y divide-zinc-800/50">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              refPaperPickList={refPaperPickList}
              projectId={projectId}
              onDelete={handleDelete}
              onEditSuccess={handleEditSuccess}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 개별 아이디어 카드 ─────────────────────────────────────

function IdeaCard({
  idea,
  refPaperPickList,
  projectId,
  onDelete,
  onEditSuccess,
  isDeleting,
}: {
  idea:             Asset
  refPaperPickList: PickedRef[]
  projectId:        string | null
  onDelete:         (id: string) => void
  onEditSuccess:    () => void
  isDeleting:       boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const bodyLines  = [idea.title, ...(idea.content ? [idea.content] : [])].join('\n')
  const preview    = bodyLines.slice(0, 200)
  const hasMore    = bodyLines.length > 200
  const createdAt  = new Date(idea.created_at).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="group px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        {/* 본문 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
            {expanded || !hasMore ? bodyLines : preview + '…'}
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {expanded ? '접기 ▴' : '더 보기 ▾'}
            </button>
          )}

          {/* 메타 정보 */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-zinc-700">{createdAt}</span>
            {idea.reference_paper && (
              <span className="text-[11px] text-zinc-600">
                · 논문 연결: {idea.reference_paper.title.slice(0, 40)}
                {idea.reference_paper.title.length > 40 ? '…' : ''}
              </span>
            )}
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex shrink-0 items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <AssetDialog
            asset={idea}
            projectId={projectId}
            referencePapers={refPaperPickList}
            onSuccess={onEditSuccess}
            trigger={
              <button
                type="button"
                className="rounded border border-zinc-700/50 px-2 py-1 text-[11px] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
              >
                편집
              </button>
            }
          />
          <button
            type="button"
            onClick={() => onDelete(idea.id)}
            disabled={isDeleting}
            className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-700 hover:border-red-800/50 hover:text-red-500 disabled:opacity-40 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
