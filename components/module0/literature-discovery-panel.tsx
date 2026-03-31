'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateResearchQuestions,
  type ResearchQuestion,
  type SearchHistoryItem,
} from '@/lib/actions/ai/research-questions'
import { searchPapers, type FoundPaper } from '@/lib/actions/search/semantic-scholar'
import { createReferencePaper } from '@/lib/actions/reference-papers'
import {
  recommendTopics,
  type TopicRecommendation,
  type PoolPaper,
} from '@/lib/actions/ai/topic-recommendations'
import { createTrack } from '@/lib/actions/tracks'

// ── Constants ─────────────────────────────────────────────
const POOL_THRESHOLD = 15   // papers needed to unlock topic recommendations

// ── Types ─────────────────────────────────────────────────
interface SearchRound {
  id:           string
  question:     string
  angle:        string
  user_insight: string | null   // researcher's own annotation
  papers:       FoundPaper[]
  error:        string | null
  savedIds:     Set<string>
  expanded:     boolean
}

interface PendingQuestion {
  question: string
  angle:    string
  insight:  string
}

interface Props {
  projectId:      string
  projectName:    string
  researchIntent: string | null
  existingDois:   Set<string>
  existingPapers: PoolPaper[]   // for topic AI context
}

// ── Component ─────────────────────────────────────────────
export function LiteratureDiscoveryPanel({
  projectId,
  projectName,
  researchIntent,
  existingDois,
  existingPapers,
}: Props) {
  const router = useRouter()

  // Questions state
  const [questions, setQuestions]       = useState<ResearchQuestion[]>([])
  const [loadingQ, setLoadingQ]         = useState(false)
  const [qError, setQError]             = useState<string | null>(null)
  const [customQ, setCustomQ]           = useState('')
  const [isFollowUp, setIsFollowUp]     = useState(false)

  // Pending question (insight input step)
  const [pendingQ, setPendingQ]         = useState<PendingQuestion | null>(null)

  // Rounds (search history)
  const [rounds, setRounds]             = useState<SearchRound[]>([])
  const [searching, setSearching]       = useState(false)

  // Pool (accumulated saved papers this session)
  const [sessionSaved, setSessionSaved] = useState<PoolPaper[]>([])
  const savedIdsRef                     = useRef<Set<string>>(new Set())

  // Topics (right panel)
  const [topics, setTopics]             = useState<TopicRecommendation[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [topicsError, setTopicsError]   = useState<string | null>(null)
  const [customTopic, setCustomTopic]   = useState('')
  const [creatingTrack, setCreatingTrack] = useState(false)

  // ── Derived ─────────────────────────────────────────────
  const intent           = researchIntent?.trim() ?? ''
  const totalPool        = existingPapers.length + sessionSaved.length
  const poolReady        = totalPool >= POOL_THRESHOLD
  const hasQuestions     = questions.length > 0

  // ── Step 1 / Refresh: Generate Questions ────────────────
  const handleGenerateQuestions = useCallback(async () => {
    if (!intent) return
    setLoadingQ(true)
    setQError(null)

    const history: SearchHistoryItem[] = rounds.map((r) => ({
      question:     r.question,
      paperTitles:  r.papers.slice(0, 8).map((p) => p.title),
      user_insight: r.user_insight,
    }))

    const result = await generateResearchQuestions(
      projectName,
      intent,
      history.length > 0 ? history : undefined,
    )

    if (!result.success) {
      setQError(result.error)
    } else {
      setQuestions(result.data)
      setIsFollowUp(rounds.length > 0)
    }
    setLoadingQ(false)
  }, [intent, projectName, rounds])

  // ── Step 2: Search papers for a question ────────────────
  const handleSearch = useCallback(async (question: string, angle: string, insight: string | null) => {
    if (!question.trim() || searching) return
    setSearching(true)
    setCustomQ('')
    setPendingQ(null)
    setQuestions([])   // clear so user generates next round

    const roundId = crypto.randomUUID()
    setRounds((prev) => [
      ...prev,
      { id: roundId, question, angle, user_insight: insight, papers: [], error: null, savedIds: new Set(), expanded: true },
    ])

    const result = await searchPapers(question, 15)

    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId
          ? {
              ...r,
              papers: result.success ? result.data : [],
              error:  result.success ? null : result.error,
            }
          : r,
      ),
    )
    setSearching(false)
  }, [searching])

  // ── Save selected papers ─────────────────────────────────
  const handleSavePaper = useCallback(async (roundId: string, paper: FoundPaper) => {
    if (savedIdsRef.current.has(paper.semanticId)) return

    const result = await createReferencePaper({
      project_id: projectId,
      title:      paper.title,
      authors:    paper.authors,
      journal:    paper.journal   ?? undefined,
      year:       paper.year      ?? undefined,
      doi:        paper.doi       ?? undefined,
      abstract:   paper.abstract  ?? undefined,
      status:     'unread',
      tags:       [],
    })

    if (result.success) {
      savedIdsRef.current.add(paper.semanticId)
      setRounds((prev) =>
        prev.map((r) => {
          if (r.id !== roundId) return r
          const next = new Set(r.savedIds)
          next.add(paper.semanticId)
          return { ...r, savedIds: next }
        }),
      )
      setSessionSaved((prev) => [
        ...prev,
        { title: paper.title, journal: paper.journal, year: paper.year },
      ])
    }
  }, [projectId])

  const handleSaveAll = useCallback(async (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId)
    if (!round) return
    for (const paper of round.papers) {
      if (!savedIdsRef.current.has(paper.semanticId)) {
        await handleSavePaper(roundId, paper)
      }
    }
  }, [rounds, handleSavePaper])

  // ── Generate topic recommendations ──────────────────────
  const handleRecommendTopics = useCallback(async () => {
    setLoadingTopics(true)
    setTopicsError(null)

    const allPapers: PoolPaper[] = [
      ...existingPapers,
      ...sessionSaved,
    ]

    const allInsights = rounds
      .map((r) => r.user_insight)
      .filter((i): i is string => !!i)

    const result = await recommendTopics(projectName, intent, allPapers, allInsights)
    if (!result.success) {
      setTopicsError(result.error)
    } else {
      setTopics(result.data)
    }
    setLoadingTopics(false)
  }, [projectName, intent, existingPapers, sessionSaved])

  // ── Create track and navigate ────────────────────────────
  const handleStartTopic = useCallback(async (topic: TopicRecommendation | null, custom?: string) => {
    const name   = topic?.title  ?? custom ?? ''
    const intent = topic?.gap    ?? ''
    if (!name.trim()) return

    setCreatingTrack(true)
    const result = await createTrack({
      project_id:      projectId,
      name:            name.trim(),
      research_intent: intent || undefined,
      description:     topic?.novelty ?? undefined,
      status:          'active',
    })

    if (result.success) {
      router.push('/tracks')
    }
    setCreatingTrack(false)
  }, [projectId, router])

  // ── Empty state ──────────────────────────────────────────
  if (!intent) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          AI 문헌 탐색을 사용하려면 프로젝트에{' '}
          <span className="text-zinc-300">Research Intent</span>를 먼저 입력하세요.
        </p>
      </div>
    )
  }

  // ── Layout ───────────────────────────────────────────────
  return (
    <div className="flex gap-5 items-start">
      {/* ── Main column ─────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col gap-5">
        {/* Research intent */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-3.5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Research Intent</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{intent}</p>
        </div>

        {/* Pool stats */}
        {(totalPool > 0 || rounds.length > 0) && (
          <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-zinc-500">
            <span>
              <span className="font-medium text-zinc-300">{totalPool}편</span> 누적
            </span>
            <span>·</span>
            <span>탐색 {rounds.length}회</span>
            {totalPool < POOL_THRESHOLD && (
              <>
                <span>·</span>
                <span className="text-zinc-600">
                  주제 추천 활성화까지 {POOL_THRESHOLD - totalPool}편 더
                </span>
              </>
            )}
            {poolReady && (
              <>
                <span>·</span>
                <span className="text-emerald-500 font-medium">주제 추천 활성화됨 →</span>
              </>
            )}
          </div>
        )}

        {/* Question generation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateQuestions}
            disabled={loadingQ || searching}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingQ ? (
              <><Spinner />질문 생성 중…</>
            ) : isFollowUp && hasQuestions ? (
              <><span>↻</span>후속 질문 재생성</>
            ) : rounds.length > 0 ? (
              <><span>✦</span>후속 질문 생성</>
            ) : (
              <><span>✦</span>AI 연구 질문 생성</>
            )}
          </button>
          {hasQuestions && !loadingQ && (
            <span className="text-xs text-zinc-600">
              {isFollowUp ? '후속' : ''} 질문 {questions.length}개
            </span>
          )}
        </div>

        {qError && (
          <ErrorBox message={qError} />
        )}

        {/* Questions list */}
        {hasQuestions && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">
              {isFollowUp ? '후속 연구 질문' : '연구 질문 선택'}{' '}
              <span className="text-zinc-700">— 하나를 클릭하거나 직접 입력하세요</span>
            </p>

            {questions.map((q, i) => {
              const isPending = pendingQ?.question === q.question
              return (
                <div key={q.question}>
                  <button
                    onClick={() => {
                      if (isPending) {
                        setPendingQ(null)
                      } else {
                        setPendingQ({ question: q.question, angle: q.angle, insight: '' })
                      }
                    }}
                    disabled={searching}
                    className={`group w-full flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isPending
                        ? 'border-indigo-500/60 bg-indigo-900/20'
                        : 'border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 hover:bg-indigo-900/10'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      isPending
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 group-hover:bg-indigo-800 group-hover:text-indigo-200'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          isPending
                            ? 'bg-indigo-800/60 text-indigo-200'
                            : 'bg-zinc-800 text-zinc-400 group-hover:bg-indigo-900/60 group-hover:text-indigo-300'
                        }`}>
                          {q.angle}
                        </span>
                      </div>
                      <p className={`text-sm leading-snug transition-colors ${
                        isPending ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
                      }`}>
                        {q.question}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 group-hover:text-zinc-500 leading-snug">
                        {q.focus}
                      </p>
                    </div>
                    <span className={`mt-1 shrink-0 text-xs transition-colors ${
                      isPending ? 'text-indigo-400' : 'text-zinc-700 group-hover:text-indigo-400'
                    }`}>
                      {isPending ? '▾' : '선택 →'}
                    </span>
                  </button>

                  {/* Insight input (expands when this question is selected) */}
                  {isPending && (
                    <div className="mt-1 rounded-b-lg border border-t-0 border-indigo-500/30 bg-indigo-950/30 px-4 py-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          💡 인사이트 추가{' '}
                          <span className="text-zinc-600 font-normal">(선택 — AI가 다음 질문에 반영)</span>
                        </label>
                        <textarea
                          placeholder="이 방향을 선택한 이유나 직관을 적어주세요. 예: 최근 foundation model이 NIR 스펙트럼 분석에서 주목받고 있어서, 이 관점이 핵심이 될 것 같아서…"
                          value={pendingQ?.insight ?? ''}
                          onChange={(e) =>
                            setPendingQ((prev) => prev ? { ...prev, insight: e.target.value } : null)
                          }
                          rows={2}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleSearch(q.question, q.angle, null)}
                          disabled={searching}
                          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          인사이트 없이 검색
                        </button>
                        <button
                          onClick={() => handleSearch(q.question, q.angle, pendingQ?.insight?.trim() || null)}
                          disabled={searching}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        >
                          {searching ? <span className="flex items-center gap-2"><Spinner />검색 중…</span> : '검색 시작 →'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Custom input */}
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 focus-within:border-zinc-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
                  ✎
                </span>
                <input
                  type="text"
                  placeholder="직접 연구 질문 입력…"
                  value={customQ}
                  onChange={(e) => setCustomQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQ.trim()) {
                      handleSearch(customQ.trim(), '직접 입력', null)
                    }
                  }}
                  disabled={searching}
                  className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none disabled:opacity-40"
                />
              </div>
              <button
                onClick={() => customQ.trim() && handleSearch(customQ.trim(), '직접 입력', null)}
                disabled={!customQ.trim() || searching}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                검색
              </button>
            </div>
          </div>
        )}

        {/* Searching indicator */}
        {searching && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-4">
            <Spinner />
            <div>
              <p className="text-sm text-zinc-300">Semantic Scholar에서 검색 중…</p>
              <p className="text-xs text-zinc-600 mt-0.5">실제 논문 데이터를 가져오고 있습니다</p>
            </div>
          </div>
        )}

        {/* Search rounds */}
        {rounds.map((round, roundIdx) => (
          <SearchRoundCard
            key={round.id}
            round={round}
            roundNumber={roundIdx + 1}
            existingDois={existingDois}
            onSavePaper={(paper) => handleSavePaper(round.id, paper)}
            onSaveAll={() => handleSaveAll(round.id)}
            onToggleExpand={() =>
              setRounds((prev) =>
                prev.map((r) =>
                  r.id === round.id ? { ...r, expanded: !r.expanded } : r,
                ),
              )
            }
          />
        ))}
      </div>

      {/* ── Right: Topic panel ───────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col gap-3 sticky top-0">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-xs font-semibold text-zinc-300">논문 주제 추천</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {poolReady
                ? `${totalPool}편 분석 기반`
                : `${totalPool} / ${POOL_THRESHOLD}편 — 아직 탐색 필요`}
            </p>
          </div>

          {!poolReady ? (
            <div className="px-4 py-6 text-center">
              <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-zinc-700 flex items-center justify-center">
                <span className="text-xs text-zinc-500">{totalPool}</span>
              </div>
              <p className="text-xs text-zinc-600">
                {POOL_THRESHOLD}편 이상 수집 후<br />주제 추천이 활성화됩니다
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-zinc-800">
                <div
                  className="h-1 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${Math.min(100, (totalPool / POOL_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>
          ) : topics.length === 0 ? (
            <div className="px-4 py-4">
              <button
                onClick={handleRecommendTopics}
                disabled={loadingTopics}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loadingTopics ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />분석 중…
                  </span>
                ) : (
                  '✦ AI 주제 분석'
                )}
              </button>
              {topicsError && <p className="mt-2 text-xs text-red-400">{topicsError}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-0 divide-y divide-zinc-800">
              {topics.map((topic, i) => (
                <TopicCard
                  key={i}
                  topic={topic}
                  index={i}
                  onStart={() => handleStartTopic(topic)}
                  disabled={creatingTrack}
                />
              ))}

              {/* Custom topic input */}
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-zinc-600">직접 주제 입력</p>
                <input
                  type="text"
                  placeholder="논문 주제 직접 입력…"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500"
                />
                <button
                  onClick={() => handleStartTopic(null, customTopic)}
                  disabled={!customTopic.trim() || creatingTrack}
                  className="w-full rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
                >
                  이 주제로 트랙 시작
                </button>
              </div>

              <div className="px-4 py-2.5">
                <button
                  onClick={handleRecommendTopics}
                  disabled={loadingTopics}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {loadingTopics ? '재분석 중…' : '↻ 재분석'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SearchRoundCard ────────────────────────────────────────

interface RoundCardProps {
  round:        SearchRound
  roundNumber:  number
  existingDois: Set<string>
  onSavePaper:  (paper: FoundPaper) => void
  onSaveAll:    () => void
  onToggleExpand: () => void
}

function SearchRoundCard({
  round, roundNumber, existingDois, onSavePaper, onSaveAll, onToggleExpand,
}: RoundCardProps) {
  const newCount  = round.papers.filter((p) => !round.savedIds.has(p.semanticId)).length
  const savedCount = round.savedIds.size

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      {/* Round header */}
      <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-3">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-500">
            {roundNumber}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-900/50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                {round.angle}
              </span>
              {savedCount > 0 && (
                <span className="text-[10px] text-emerald-500">{savedCount}편 저장됨</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-1">
              {round.question}
            </p>
            {round.user_insight && (
              <p className="mt-0.5 text-[10px] text-amber-500/80 leading-snug line-clamp-1 italic">
                💡 {round.user_insight}
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {round.papers.length > 0 && (
            <span className="text-xs text-zinc-600">{round.papers.length}편</span>
          )}
          <span className="text-xs text-zinc-700">{round.expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Papers */}
      {round.expanded && (
        <>
          {round.error ? (
            <ErrorBox message={round.error} className="m-3" />
          ) : round.papers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-600">검색 결과가 없습니다.</p>
          ) : (
            <>
              {/* Save all bar */}
              {newCount > 0 && (
                <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/40 px-4 py-2">
                  <span className="text-xs text-zinc-500">{newCount}편 미저장</span>
                  <button
                    onClick={onSaveAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    전체 저장
                  </button>
                </div>
              )}
              <div className="divide-y divide-zinc-800/40 max-h-80 overflow-y-auto">
                {round.papers.map((paper) => {
                  const alreadyInDb = !!paper.doi && existingDois.has(paper.doi)
                  const savedNow    = round.savedIds.has(paper.semanticId)
                  return (
                    <PaperRow
                      key={paper.semanticId}
                      paper={paper}
                      alreadyInDb={alreadyInDb}
                      savedNow={savedNow}
                      onSave={() => onSavePaper(paper)}
                    />
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── PaperRow ──────────────────────────────────────────────

interface PaperRowProps {
  paper:       FoundPaper
  alreadyInDb: boolean
  savedNow:    boolean
  onSave:      () => void
}

function PaperRow({ paper, alreadyInDb, savedNow, onSave }: PaperRowProps) {
  const [showAbstract, setShowAbstract] = useState(false)
  const saved = alreadyInDb || savedNow

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-zinc-900/20 hover:bg-zinc-800/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
          {paper.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
          {paper.authors.length > 0 && (
            <span>{paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' 외' : ''}</span>
          )}
          {paper.journal && <span>· {paper.journal}</span>}
          {paper.year    && <span>· {paper.year}</span>}
          {paper.citation_count > 0 && (
            <span className="text-zinc-600">· 인용 {paper.citation_count.toLocaleString()}</span>
          )}
        </div>
        {paper.abstract && (
          <div className="mt-1">
            <button
              onClick={() => setShowAbstract((v) => !v)}
              className="text-[11px] text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              {showAbstract ? '접기' : 'Abstract'}
            </button>
            {showAbstract && (
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                {paper.abstract}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {paper.open_access_url && (
          <a
            href={paper.open_access_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-indigo-400 hover:text-indigo-300 border border-zinc-700 rounded px-1.5 py-0.5 transition-colors"
          >
            PDF
          </a>
        )}
        {saved ? (
          <span className="text-[10px] text-emerald-500">
            {alreadyInDb ? '기저장' : '✓ 저장됨'}
          </span>
        ) : (
          <button
            onClick={onSave}
            className="text-[10px] text-zinc-500 hover:text-indigo-300 border border-zinc-700 hover:border-indigo-600 rounded px-1.5 py-0.5 transition-colors"
          >
            저장
          </button>
        )}
      </div>
    </div>
  )
}

// ── TopicCard ─────────────────────────────────────────────

interface TopicCardProps {
  topic:    TopicRecommendation
  index:    number
  onStart:  () => void
  disabled: boolean
}

function TopicCard({ topic, index, onStart, disabled }: TopicCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-3 py-3 hover:bg-zinc-800/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-500">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium text-zinc-200 leading-snug cursor-pointer hover:text-zinc-100"
              onClick={() => setExpanded((v) => !v)}
            >
              {topic.title}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-500">
                {topic.angle}
              </span>
              <span className="text-[9px] text-zinc-600">
                논문 {topic.supporting_count}편 뒷받침
              </span>
              <span className={`text-[9px] font-medium ${
                topic.confidence >= 80 ? 'text-emerald-500' : 'text-zinc-500'
              }`}>
                {topic.confidence}%
              </span>
            </div>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] text-zinc-500 leading-snug">{topic.gap}</p>
                <p className="text-[11px] text-zinc-600 leading-snug italic">{topic.novelty}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={disabled}
        className="mt-2.5 w-full rounded bg-indigo-700/70 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-600 disabled:opacity-40 transition-colors"
      >
        {disabled ? '생성 중…' : '이 주제로 트랙 시작 →'}
      </button>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function ErrorBox({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-2.5 text-sm text-red-400 ${className ?? ''}`}>
      {message}
    </div>
  )
}
