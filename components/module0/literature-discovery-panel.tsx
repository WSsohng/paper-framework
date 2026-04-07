'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateResearchQuestions,
  type ResearchQuestion,
  type SearchHistoryItem,
} from '@/lib/actions/ai/research-questions'
import { searchPapers, type FoundPaper } from '@/lib/actions/search/search-papers'
import { planSearch, type SearchPlan } from '@/lib/actions/ai/plan-search'
import { verifyPaperRelevance, type PaperVerification, type PaperMatch } from '@/lib/actions/ai/verify-papers'
import { synthesizeSearchResults } from '@/lib/actions/ai/synthesize-results'
import { createReferencePaper } from '@/lib/actions/reference-papers'
import {
  recommendTopics,
  type TopicRecommendation,
  type PoolPaper,
} from '@/lib/actions/ai/topic-recommendations'
import { createTrack } from '@/lib/actions/tracks'
import {
  getDiscoveryRounds,
  saveDiscoveryRound,
  updateRoundSavedIds,
  updateRoundInsight,
  clearDiscoveryRounds,
  type DiscoveryRoundRow,
} from '@/lib/actions/discovery-rounds'

// ── Constants ─────────────────────────────────────────────
const POOL_THRESHOLD = 15   // papers needed to unlock topic recommendations

// ── Types ─────────────────────────────────────────────────

/** 검색 단계 표시용 */
type SearchPhase =
  | 'extracting'   // 키워드 추출 중
  | 'searching'    // 논문 DB 검색 중
  | 'verifying'    // 관련성 검토 중
  | 'done'

interface SearchRound {
  id:           string
  question:     string
  angle:        string
  user_insight: string | null
  // ── 검색 계획 (planSearch 결과)
  search_plan:  SearchPlan | null
  // ── 검색 결과
  papers:       FoundPaper[]
  error:        string | null
  // ── 관련성 검토 결과 (index → verification)
  verifications: Map<number, PaperVerification>
  // ── 상태
  phase:        SearchPhase
  // 다중 검색 진행 상황 (예: "1/2")
  searchProgress: string | null
  savedIds:     Set<string>
  expanded:     boolean
  showUnrelated: boolean
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
  existingPapers: PoolPaper[]
}

// ── DB row → SearchRound 변환 ─────────────────────────────

function isSearchPlan(kw: unknown): kw is SearchPlan {
  return (
    typeof kw === 'object' &&
    kw !== null &&
    'searches' in kw &&
    Array.isArray((kw as SearchPlan).searches)
  )
}

function rowToRound(row: DiscoveryRoundRow): SearchRound {
  const rawKw = row.keywords
  return {
    id:           row.id,
    question:     row.question,
    angle:        row.angle,
    user_insight: row.user_insight,
    // 신규(SearchPlan) 형식만 채택; 레거시(KeywordExtractResult)는 null 처리
    search_plan:    isSearchPlan(rawKw) ? rawKw : null,
    papers:         row.papers,
    verifications:  new Map(
      row.verifications.map((v) => [v.index, v as PaperVerification])
    ),
    savedIds:       new Set(row.saved_semantic_ids),
    phase:          'done',
    searchProgress: null,
    expanded:       false,
    showUnrelated:  row.show_unrelated,
    error:          null,
  }
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
  const selectedProjectId = projectId

  // ── DB 로드 상태 ─────────────────────────────────────────
  const [dbLoaded, setDbLoaded] = useState(false)

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
  const [activePhase, setActivePhase]   = useState<SearchPhase | null>(null)

  // Pool (accumulated saved papers this session)
  const [sessionSaved, setSessionSaved] = useState<PoolPaper[]>([])
  const savedIdsRef                     = useRef<Set<string>>(new Set())

  // Topics (right panel)
  const [topics, setTopics]             = useState<TopicRecommendation[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [topicsError, setTopicsError]   = useState<string | null>(null)
  const [customTopic, setCustomTopic]   = useState('')
  const [creatingTrack, setCreatingTrack] = useState(false)

  // ── DB: 프로젝트 변경 시 state 초기화 + 라운드 재로드 ──
  useEffect(() => {
    // 이전 프로젝트 데이터 완전 초기화
    setRounds([])
    setQuestions([])
    setTopics([])
    setSessionSaved([])
    setCustomQ('')
    setCustomTopic('')
    setIsFollowUp(false)
    setDbLoaded(false)
    savedIdsRef.current = new Set()

    getDiscoveryRounds(projectId).then((rows) => {
      setRounds(rows.map(rowToRound))
      setIsFollowUp(rows.length > 0)
      setDbLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

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

  const searching = activePhase != null

  // ── 단일 검색 + rate-limit 재시도 헬퍼 ─────────────────
  const fetchWithRetry = useCallback(async (
    query: string,
    yearFrom: number | undefined,
    roundId: string,
    progressLabel: string,
  ) => {
    let result = await searchPapers(query, { limit: 20, yearFrom })
    let retryCount = 0
    while (!result.success && result.error === 'RATE_LIMIT' && retryCount < 4) {
      const waitSecs = result.retryAfterSecs
        ? Math.max(result.retryAfterSecs, 5)
        : (retryCount + 1) * 20
      for (let s = waitSecs; s > 0; s--) {
        setRounds((prev) => prev.map((r) =>
          r.id === roundId
            ? { ...r, phase: 'searching', error: `${progressLabel} — 요청 한도 초과, ${s}초 후 재시도… (${retryCount + 1}/4)` }
            : r,
        ))
        await new Promise((res) => setTimeout(res, 1000))
      }
      setRounds((prev) => prev.map((r) =>
        r.id === roundId ? { ...r, error: null } : r,
      ))
      result = await searchPapers(query, { limit: 20, yearFrom })
      retryCount++
    }
    return result
  }, [])

  // ── Step 2: 의도 기반 다중 검색 파이프라인 ───────────────
  const runSearchPhases = useCallback(async (roundId: string, question: string) => {
    if (activePhase != null) return

    // ── Phase 1: 검색 계획 수립 (planSearch) ─────────────
    setActivePhase('extracting')
    setRounds((prev) => prev.map((r) =>
      r.id === roundId
        ? { ...r, phase: 'extracting', error: null, papers: [], verifications: new Map(), search_plan: null, searchProgress: null }
        : r,
    ))

    const planResult = await planSearch(question, intent, selectedProjectId)
    const plan       = planResult.success ? planResult.data : null

    setRounds((prev) => prev.map((r) =>
      r.id === roundId ? { ...r, search_plan: plan, phase: 'searching' } : r,
    ))

    // ── Phase 2: 각 서브쿼리 순차 실행 ───────────────────
    setActivePhase('searching')

    const searches = plan?.searches ?? [{
      id: 's1', purpose: '직접 탐색',
      query: question.slice(0, 100), yearFrom: undefined,
    }]

    // 각 검색 결과를 서브쿼리별로 보관 (중복 제거 전)
    const groupedResults: { search_id: string; purpose: string; papers: FoundPaper[] }[] = []

    for (let i = 0; i < searches.length; i++) {
      const sq        = searches[i]
      const progress  = searches.length > 1 ? `검색 ${i + 1}/${searches.length}` : ''

      setRounds((prev) => prev.map((r) =>
        r.id === roundId
          ? { ...r, searchProgress: progress || null, error: null }
          : r,
      ))

      const res = await fetchWithRetry(sq.query, sq.yearFrom, roundId, progress || sq.purpose)

      if (!res.success) {
        const msg = res.error === 'RATE_LIMIT'
          ? '논문 DB 요청 한도 초과. ↻ 다시 검색 버튼으로 재시도하거나 잠시 후 다시 시도해 주세요.'
          : res.error
        setRounds((prev) => prev.map((r) =>
          r.id === roundId ? { ...r, error: msg, phase: 'done', searchProgress: null } : r,
        ))
        setActivePhase(null)
        return
      }

      groupedResults.push({ search_id: sq.id, purpose: sq.purpose, papers: res.data })
    }

    // 중복 제거 (semanticId 기준, 첫 등장 우선)
    const seen      = new Set<string>()
    const allPapers: FoundPaper[] = []
    for (const group of groupedResults) {
      for (const p of group.papers) {
        if (!seen.has(p.semanticId)) {
          seen.add(p.semanticId)
          allPapers.push(p)
        }
      }
    }

    setRounds((prev) => prev.map((r) =>
      r.id === roundId ? { ...r, papers: allPapers, phase: 'verifying', searchProgress: null } : r,
    ))

    // ── Phase 3: 관련성 분석 ─────────────────────────────
    setActivePhase('verifying')

    const isMultiSearch = searches.length > 1 && plan?.query_type !== 'direct_search'
    let verifications: PaperVerification[]

    if (isMultiSearch && plan) {
      // gap_analysis / comparison: Claude가 그룹별 컨텍스트로 합성
      verifications = await synthesizeSearchResults(
        question,
        intent,
        allPapers,
        groupedResults,
        plan.synthesis_instruction,
        selectedProjectId,
      )
    } else {
      // direct_search / trend_analysis: 기존 개별 검토
      verifications = await verifyPaperRelevance(
        question,
        intent,
        allPapers.map((p) => ({ title: p.title, abstract: p.abstract, year: p.year, journal: p.journal })),
        selectedProjectId,
      )
    }

    const verMap = new Map(verifications.map((v) => [v.index, v]))

    setRounds((prev) => prev.map((r) =>
      r.id === roundId ? { ...r, verifications: verMap, phase: 'done' } : r,
    ))
    setActivePhase(null)

    // ── DB 저장 ───────────────────────────────────────────
    const currentRound = rounds.find((r) => r.id === roundId)
    if (currentRound) {
      const saveResult = await saveDiscoveryRound({
        project_id:    projectId,
        question,
        angle:         currentRound.angle,
        user_insight:  currentRound.user_insight,
        keywords:      plan ?? null,
        papers:        allPapers,
        verifications: verifications.map((v) => ({ index: v.index, match: v.match, note: v.note ?? '' })),
      })
      if (saveResult.success && saveResult.id) {
        setRounds((prev) => prev.map((r) =>
          r.id === roundId ? { ...r, id: saveResult.id!, verifications: verMap, phase: 'done' } : r,
        ))
      }
    }
  }, [activePhase, intent, selectedProjectId, projectId, rounds, fetchWithRetry])

  // ── Step 2a: 새 라운드 시작 ──────────────────────────────
  const handleSearch = useCallback(async (question: string, angle: string, insight: string | null) => {
    if (!question.trim() || activePhase != null) return
    setCustomQ('')
    setPendingQ(null)
    setQuestions([])

    const roundId = crypto.randomUUID()

    // 라운드 초기 생성
    setRounds((prev) => [
      ...prev,
      {
        id: roundId, question, angle, user_insight: insight,
        search_plan: null, papers: [], error: null,
        verifications: new Map(), phase: 'extracting',
        searchProgress: null,
        savedIds: new Set(), expanded: true, showUnrelated: false,
      },
    ])

    await runSearchPhases(roundId, question)
  }, [activePhase, runSearchPhases])

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
          // DB 업데이트 (fire-and-forget)
          updateRoundSavedIds(roundId, Array.from(next)).catch(() => {})
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

  // ── DB 로딩 중 ───────────────────────────────────────────
  if (!dbLoaded) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
        <Spinner />이전 탐색 기록 불러오는 중…
      </div>
    )
  }

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
        <div className="flex items-center gap-3 flex-wrap">
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
          {rounds.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm('탐색 히스토리를 초기화할까요? 저장된 논문은 유지됩니다.')) return
                await clearDiscoveryRounds(projectId)
                setRounds([])
                setQuestions([])
                setIsFollowUp(false)
                setPendingQ(null)
              }}
              className="ml-auto text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              히스토리 초기화
            </button>
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

        {/* 3단계 진행 표시기 */}
        {activePhase && (() => {
          const activeRound = rounds.find((r) => r.phase !== 'done')
          const plan        = activeRound?.search_plan ?? null
          const steps = [
            {
              phase: 'extracting' as const,
              label: '검색 계획',
              desc:  plan
                ? `${plan.query_type === 'gap_analysis' ? '차집합 분석' : plan.query_type === 'comparison' ? '비교 검색' : plan.query_type === 'trend_analysis' ? '트렌드 탐색' : '직접 검색'} · ${plan.searches.length}개 쿼리`
                : 'Claude가 전략 수립 중',
            },
            {
              phase: 'searching' as const,
              label: '논문 탐색',
              desc:  activeRound?.searchProgress
                ? activeRound.searchProgress
                : plan && plan.searches.length > 1
                  ? `${plan.searches.length}개 쿼리 실행`
                  : '논문 DB 쿼리',
            },
            {
              phase: 'verifying' as const,
              label: plan?.query_type === 'gap_analysis' || plan?.query_type === 'comparison'
                ? '갭 분석'
                : '관련성 검토',
              desc: plan?.query_type === 'gap_analysis'
                ? 'Claude가 미적용 기법 식별'
                : plan?.query_type === 'comparison'
                  ? 'Claude가 비교 분석'
                  : 'Claude가 결과 필터링',
            },
          ] as const
          const phases: SearchPhase[] = ['extracting', 'searching', 'verifying']
          const currentIdx = phases.indexOf(activePhase)
          return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-4 space-y-3">
              <div className="flex items-center gap-4">
                {steps.map((step, i) => {
                  const stepIdx = phases.indexOf(step.phase)
                  const isDone  = stepIdx < currentIdx
                  const isActive = stepIdx === currentIdx
                  return (
                    <div key={step.phase} className="flex items-center gap-2">
                      {i > 0 && <span className="text-zinc-700">→</span>}
                      <div className={`flex items-center gap-1.5 ${
                        isActive ? 'text-indigo-300' : isDone ? 'text-emerald-500' : 'text-zinc-600'
                      }`}>
                        {isActive ? <Spinner /> : isDone ? <span>✓</span> : <span className="w-4" />}
                        <div>
                          <p className="text-xs font-medium">{step.label}</p>
                          <p className="text-[10px] opacity-70">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

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
            onToggleUnrelated={() =>
              setRounds((prev) =>
                prev.map((r) =>
                  r.id === round.id ? { ...r, showUnrelated: !r.showUnrelated } : r,
                ),
              )
            }
            onRetry={() => {
              // 기존 라운드 ID 재사용 — 새 라운드 추가 없이 재검색
              runSearchPhases(round.id, round.question)
            }}
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
  round:            SearchRound
  roundNumber:      number
  existingDois:     Set<string>
  onSavePaper:      (paper: FoundPaper) => void
  onSaveAll:        () => void
  onToggleExpand:   () => void
  onToggleUnrelated: () => void
  onRetry:          () => void
}

const MATCH_CONFIG: Record<PaperMatch, { label: string; dot: string; rowCls: string }> = {
  direct:    { label: '직접 관련',  dot: 'bg-emerald-400', rowCls: '' },
  partial:   { label: '부분 관련',  dot: 'bg-amber-400',   rowCls: 'opacity-80' },
  unrelated: { label: '관련 없음',  dot: 'bg-zinc-600',    rowCls: 'opacity-40' },
}

function SearchRoundCard({
  round, roundNumber, existingDois, onSavePaper, onSaveAll, onToggleExpand, onToggleUnrelated, onRetry,
}: RoundCardProps) {
  const verified    = round.verifications.size > 0
  const directCount = verified
    ? round.papers.filter((_, i) => round.verifications.get(i)?.match === 'direct').length
    : null
  const unrelatedCount = verified
    ? round.papers.filter((_, i) => round.verifications.get(i)?.match === 'unrelated').length
    : 0
  const visiblePapers = round.papers.filter((_, i) => {
    if (!verified || round.showUnrelated) return true
    return round.verifications.get(i)?.match !== 'unrelated'
  })
  const newCount   = visiblePapers.filter((p) => !round.savedIds.has(p.semanticId)).length
  const savedCount = round.savedIds.size

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      {/* Round header */}
      <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-3">
        <button onClick={onToggleExpand} className="flex items-center gap-2.5 min-w-0 text-left">
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-500">
            {roundNumber}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-indigo-900/50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                {round.angle}
              </span>
              {savedCount > 0 && (
                <span className="text-[10px] text-emerald-500">{savedCount}편 저장됨</span>
              )}
              {directCount !== null && directCount > 0 && (
                <span className="text-[10px] text-emerald-400/80">
                  {round.search_plan?.query_type === 'gap_analysis'
                    ? `갭 후보 ${directCount}편`
                    : `직접 관련 ${directCount}편`}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-1">
              {round.question}
            </p>
            {/* 검색 계획 표시 */}
            {round.search_plan && (
              <div className="mt-1 flex flex-wrap gap-1 items-center">
                {/* 쿼리 유형 뱃지 */}
                {round.search_plan.query_type !== 'direct_search' && (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                    round.search_plan.query_type === 'gap_analysis'
                      ? 'bg-violet-900/40 text-violet-400'
                      : round.search_plan.query_type === 'comparison'
                        ? 'bg-blue-900/40 text-blue-400'
                        : 'bg-teal-900/40 text-teal-400'
                  }`}>
                    {round.search_plan.query_type === 'gap_analysis'
                      ? '차집합'
                      : round.search_plan.query_type === 'comparison'
                        ? '비교'
                        : '트렌드'}
                  </span>
                )}
                {/* 서브쿼리 목적 태그 */}
                {round.search_plan.searches.map((sq) => (
                  <span key={sq.id} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono" title={sq.query}>
                    {sq.purpose}
                  </span>
                ))}
                {/* 대표 키워드 */}
                {round.search_plan.keywords.slice(0, 4).map((kw) => (
                  <span key={kw} className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] text-zinc-600 font-mono">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            {round.user_insight && (
              <p className="mt-0.5 text-[10px] text-amber-500/80 leading-snug line-clamp-1 italic">
                💡 {round.user_insight}
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {round.phase !== 'done' && round.phase !== 'extracting' && (
            <span className="text-[10px] text-indigo-400 flex items-center gap-1">
              <Spinner />
              {round.phase === 'searching'
                ? round.searchProgress ?? '검색 중'
                : round.search_plan?.query_type === 'gap_analysis'
                  ? '갭 분석 중'
                  : '검토 중'}
            </span>
          )}
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
            <div className="m-3 space-y-2">
              {round.phase === 'searching' ? (
                // 카운트다운 중 — 진행 표시
                <div className="flex items-center gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-400">
                  <Spinner />
                  {round.error}
                </div>
              ) : (
                <>
                  <ErrorBox message={round.error} />
                  <button
                    onClick={onRetry}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    ↻ 다시 검색
                  </button>
                </>
              )}
            </div>
          ) : round.papers.length === 0 && round.phase === 'done' ? (
            <p className="px-4 py-3 text-sm text-zinc-600">검색 결과가 없습니다.</p>
          ) : visiblePapers.length > 0 ? (
            <>
              {/* 상단 바: 저장 + unrelated 토글 */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/40 px-4 py-2 gap-3">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {newCount > 0 && <span>{newCount}편 미저장</span>}
                  {unrelatedCount > 0 && (
                    <button
                      onClick={onToggleUnrelated}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors underline"
                    >
                      {round.showUnrelated
                        ? `관련 없음 ${unrelatedCount}편 숨기기`
                        : `관련 없음 ${unrelatedCount}편 표시`}
                    </button>
                  )}
                </div>
                {newCount > 0 && (
                  <button
                    onClick={onSaveAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    전체 저장
                  </button>
                )}
              </div>

              <div className="divide-y divide-zinc-800/40 max-h-[480px] overflow-y-auto">
                {[...visiblePapers]
                  .sort((a, b) => (a.is_review ? 1 : 0) - (b.is_review ? 1 : 0))
                  .map((paper, visIdx) => {
                  // 원래 인덱스 (verifications 맵 키)
                  const origIdx     = round.papers.indexOf(paper)
                  const verification = round.verifications.get(origIdx) ?? null
                  const alreadyInDb = !!paper.doi && existingDois.has(paper.doi)
                  const savedNow    = round.savedIds.has(paper.semanticId)
                  return (
                    <PaperRow
                      key={paper.semanticId}
                      paper={paper}
                      verification={verification}
                      alreadyInDb={alreadyInDb}
                      savedNow={savedNow}
                      onSave={() => onSavePaper(paper)}
                    />
                  )
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

// ── PaperRow ──────────────────────────────────────────────

interface PaperRowProps {
  paper:        FoundPaper
  verification: PaperVerification | null
  alreadyInDb:  boolean
  savedNow:     boolean
  onSave:       () => void
}

function PaperRow({ paper, verification, alreadyInDb, savedNow, onSave }: PaperRowProps) {
  const [showAbstract, setShowAbstract] = useState(false)
  const saved  = alreadyInDb || savedNow
  const match  = verification?.match ?? null
  const cfg    = match ? MATCH_CONFIG[match] : null

  // 리뷰 논문은 행 전체를 약하게 처리
  const reviewCls = paper.is_review ? 'opacity-60' : ''

  return (
    <div className={`flex items-start gap-3 px-4 py-3 bg-zinc-900/20 hover:bg-zinc-800/20 transition-colors ${cfg?.rowCls ?? ''} ${reviewCls}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* 관련성 도트 */}
          {cfg && (
            <span
              className={`mt-1.5 shrink-0 h-2 w-2 rounded-full ${cfg.dot}`}
              title={`${cfg.label}${verification?.note ? ': ' + verification.note : ''}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
                {paper.title}
              </p>
              {paper.is_review && (
                <span className="shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-900/30 text-amber-500/80 border border-amber-800/40">
                  리뷰
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
              {paper.authors.length > 0 && (
                <span>{paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' 외' : ''}</span>
              )}
              {paper.journal && <span>· {paper.journal}</span>}
              {paper.year    && <span className="font-medium text-zinc-500">· {paper.year}</span>}
              {paper.citation_count > 0 && (
                <span>· 인용 {paper.citation_count.toLocaleString()}</span>
              )}
            </div>
            {/* 관련성 검토 노트 */}
            {verification?.note && verification.note !== '자동 검토 불가' && (
              <p className={`mt-0.5 text-[10px] leading-snug italic ${
                match === 'direct'    ? 'text-emerald-500/80' :
                match === 'partial'   ? 'text-amber-500/70' :
                                        'text-zinc-600'
              }`}>
                {cfg?.label}: {verification.note}
              </p>
            )}
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
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {/* Google Scholar 검색 링크 — 무결성 확인용 */}
        <a
          href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 transition-colors"
          title="Google Scholar에서 확인"
        >
          GS
        </a>
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
