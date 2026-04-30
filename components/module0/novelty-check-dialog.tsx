'use client'

import { useEffect, useState } from 'react'
import type { TopicRecommendation } from '@/lib/actions/ai/topic-recommendations'
import type {
  NoveltyCheckResult,
  NoveltySignal,
  NoveltyDimension,
  DimensionAnalysis,
} from '@/lib/types/novelty-check'
import { DIMENSION_LABEL } from '@/lib/types/novelty-check'
import { checkNovelty } from '@/lib/actions/ai/novelty-check'

interface Props {
  open:               boolean
  topic:              TopicRecommendation | null
  researchIntent:     string
  researchQuestions:  string[]
  userInsights:       string[]
  poolPaperTitles:    string[]
  onClose:            () => void
  onProceed:          (result: NoveltyCheckResult) => void
  onRevert:           (signal: NoveltySignal) => void
}

const VERDICT_COLOR: Record<DimensionAnalysis['verdict'], string> = {
  novel:   'bg-emerald-900/40 text-emerald-200 border-emerald-700/40',
  partial: 'bg-amber-900/40 text-amber-200 border-amber-700/40',
  overlap: 'bg-rose-900/40 text-rose-200 border-rose-700/40',
}

const VERDICT_LABEL: Record<DimensionAnalysis['verdict'], string> = {
  novel:   '차별 뚜렷',
  partial: '일부 겹침',
  overlap: '강한 겹침',
}

export function NoveltyCheckDialog({
  open, topic,
  researchIntent, researchQuestions, userInsights, poolPaperTitles,
  onClose, onProceed, onRevert,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<NoveltyCheckResult | null>(null)
  const [error, setError]     = useState<string | null>(null)

  // 다이얼로그 열림 + 주제 변경 시 자동 검증 실행
  useEffect(() => {
    if (!open || !topic) {
      setResult(null)
      setError(null)
      return
    }

    let alive = true
    setLoading(true)
    setError(null)
    setResult(null)

    checkNovelty({
      topic:             { title: topic.title, gap: topic.gap, angle: topic.angle },
      researchIntent,
      researchQuestions,
      userInsights,
      poolPaperTitles,
    })
      .then((r) => {
        if (!alive) return
        if (r.success) setResult(r.data)
        else setError(r.error)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [open, topic, researchIntent, researchQuestions, userInsights, poolPaperTitles])

  if (!open || !topic) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-500">Novelty 검증</p>
            <p className="mt-1 text-sm font-medium text-zinc-200 leading-snug">{topic.title}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">전략 관점: {topic.angle}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-3 py-10 text-sm text-zinc-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
              검증 중… (1단계 AI 사전 분석 → 2단계 외부 검색 → 3단계 종합)
            </div>
          )}

          {error && (
            <div className="rounded border border-rose-800/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
              검증 실패: {error}
              <p className="mt-2 text-[11px] text-rose-400/80">
                다시 시도하려면 다이얼로그를 닫고 검증 버튼을 다시 누르세요.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* 종합 요약 */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <p className="text-[11px] font-medium text-zinc-500 mb-1.5">종합 평가</p>
                <p className="text-sm text-zinc-200 leading-relaxed">{result.summary}</p>
              </div>

              {/* 5차원 분석 */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-zinc-500">5차원 분석</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.entries(result.dimensions) as [NoveltyDimension, DimensionAnalysis][]).map(([dim, v]) => (
                    <div key={dim} className={`rounded border px-3 py-2 ${VERDICT_COLOR[v.verdict]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{DIMENSION_LABEL[dim]}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide">{VERDICT_LABEL[v.verdict]}</span>
                      </div>
                      <p className="text-[11px] leading-snug opacity-90">{v.rationale}</p>
                      {v.risk && (
                        <p className="mt-1 text-[10px] leading-snug opacity-80 italic">⚠ {v.risk}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 유사 논문 */}
              {result.similar_papers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-zinc-500">
                    유사 논문 {result.similar_papers.length}편 (Semantic Scholar 외부 검색 결과)
                  </p>
                  <div className="space-y-1.5">
                    {result.similar_papers.map((p, i) => (
                      <div key={i} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                            {DIMENSION_LABEL[p.dimension]}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {p.year ?? '?'} · {p.journal ?? 'no journal'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-snug">{p.title}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 italic">{p.authors.join(', ')}</p>
                        <p className="mt-1 text-[11px] text-amber-300/90 leading-snug">→ {p.similarity_note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 */}
              <div className="sticky bottom-0 -mx-5 -mb-4 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-3">
                <button
                  onClick={() => onRevert(buildSignal(result))}
                  className="rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition-colors"
                >
                  ↶ 질문 단계로 회귀 (다음 라운드 시그널 반영)
                </button>
                <button
                  onClick={() => onProceed(result)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  트랙 생성 진행 →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 검증 결과 → 회귀 시그널 자동 변환 ──────────────────────

function buildSignal(result: NoveltyCheckResult): NoveltySignal {
  const dims = Object.entries(result.dimensions) as [NoveltyDimension, DimensionAnalysis][]

  const weak = dims
    .filter(([, v]) => v.verdict === 'partial' || v.verdict === 'overlap')
    .map(([k]) => k)

  const guidancePieces = dims
    .filter(([, v]) => v.verdict !== 'novel')
    .map(([k, v]) => `[${DIMENSION_LABEL[k]}] ${v.risk ?? v.rationale}`)

  return {
    attempted_title: result.target.title,
    weak_dimensions: weak,
    guidance:        guidancePieces.length > 0 ? guidancePieces.join(' | ') : result.summary,
    created_at:      new Date().toISOString(),
  }
}
