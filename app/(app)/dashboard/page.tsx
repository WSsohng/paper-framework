import Link from 'next/link'
import { FRAMEWORK_MASTER_INSIGHT } from '@/lib/framework-philosophy'
import { computeGuideState } from '@/lib/guide-engine'
import { getProject } from '@/lib/actions/projects'
import { getTracks } from '@/lib/actions/tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { createClient } from '@/lib/supabase/server'
import { ProjectStatusBadge, TrackStatusBadge } from '@/components/ui/badge'
import { ProjectDialog } from '@/components/module0/project-dialog'
import { GuideCard } from '@/components/guide/guide-card'
import type { Project, Track } from '@/lib/types'

export const metadata = { title: 'Dashboard — PaperFactory' }

// ── 진행 데이터 fetch ─────────────────────────────────────

interface Progress {
  refPaperCount:         number
  keyPaperCount:         number
  tier1Count:            number
  tier2Count:            number
  journalCount:          number
  shortlistedCount:      number
  assetCount:            number
  hypothesisCount:       number
  activeHypothesisCount: number
  draftCount:            number
  readyDraftCount:       number
  figureCount:           number
  finalFigureCount:      number
  reviewCount:           number
  resolvedReviewCount:   number
}

async function fetchProgress(projectId: string, trackIds: string[]): Promise<Progress> {
  const supabase = await createClient()

  const [refPapers, journals, assets, hypotheses, drafts, figures, reviews] = await Promise.all([
    supabase.from('reference_papers').select('status, tier').eq('project_id', projectId),
    supabase.from('journals').select('status').eq('project_id', projectId),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    trackIds.length > 0
      ? supabase.from('hypotheses').select('status').in('track_id', trackIds)
      : Promise.resolve({ data: [] as { status: string }[] }),
    trackIds.length > 0
      ? supabase.from('drafts').select('id, status').in('track_id', trackIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    trackIds.length > 0
      ? supabase.from('figures').select('status').in('track_id', trackIds)
      : Promise.resolve({ data: [] as { status: string }[] }),
    trackIds.length > 0
      ? supabase.from('reviews').select('resolved').in('track_id', trackIds)
      : Promise.resolve({ data: [] as { resolved: boolean }[] }),
  ])

  const rp = refPapers.data ?? []
  const jr = journals.data ?? []
  const hy = hypotheses.data ?? []
  const dr = drafts.data ?? []
  const fg = figures.data ?? []
  const rv = reviews.data ?? []

  return {
    refPaperCount:         rp.length,
    keyPaperCount:         rp.filter((p) => p.status === 'key').length,
    tier1Count:            rp.filter((p) => p.tier === 1).length,
    tier2Count:            rp.filter((p) => p.tier === 2).length,
    journalCount:          jr.length,
    shortlistedCount:      jr.filter((j) => j.status === 'shortlisted' || j.status === 'submitted' || j.status === 'accepted').length,
    assetCount:            (assets as { count: number }).count ?? 0,
    hypothesisCount:       hy.length,
    activeHypothesisCount: hy.filter((h) => h.status === 'active' || h.status === 'testing' || h.status === 'confirmed').length,
    draftCount:            dr.length,
    readyDraftCount:       dr.filter((d) => d.status === 'ready' || d.status === 'submitted').length,
    figureCount:           fg.length,
    finalFigureCount:      fg.filter((f) => f.status === 'final').length,
    reviewCount:           rv.length,
    resolvedReviewCount:   rv.filter((r) => r.resolved).length,
  }
}

// ── 단계별 충실도 점수 (Publication Readiness) ────────────
// 각 단계 0-100점, 전체 평균 = 종합 Readiness

interface StageReadiness {
  module:    string
  label:     string
  score:     number   // 0–100
  detail:    string
  href:      string
}

function calcReadiness(p: Progress): StageReadiness[] {
  return [
    {
      module: 'M0',
      label:  '문헌 탐색',
      score:  Math.min(100, Math.round(
        (Math.min(p.refPaperCount, 15) / 15) * 50 +  // 수량 (15편 = 50점)
        (Math.min(p.tier1Count, 3)    /  3) * 30 +  // T1 분류 (3편 = 30점)
        (Math.min(p.tier2Count, 5)    /  5) * 20    // T2 분류 (5편 = 20점)
      )),
      detail: `${p.refPaperCount}편 · T1 ${p.tier1Count}편 · T2 ${p.tier2Count}편`,
      href: '/reference-papers',
    },
    {
      module: 'M1',
      label:  '저널 전략',
      score:  Math.min(100, Math.round(
        (Math.min(p.journalCount, 3)      / 3) * 40 +  // 저널 수집 (3개 = 40점)
        (Math.min(p.shortlistedCount, 2)  / 2) * 60    // shortlist 확정 (2개 = 60점)
      )),
      detail: `${p.journalCount}개 검토 · ${p.shortlistedCount}개 후보 확정`,
      href: '/journal',
    },
    {
      module: 'M2',
      label:  '자산 수집',
      score:  Math.min(100, Math.round((Math.min(p.assetCount, 10) / 10) * 100)),
      detail: `${p.assetCount}개 자산`,
      href: '/assets',
    },
    {
      module: 'M3',
      label:  '가설·논증',
      score:  Math.min(100, Math.round(
        (Math.min(p.hypothesisCount, 3)      / 3) * 40 +
        (Math.min(p.activeHypothesisCount, 1) / 1) * 60
      )),
      detail: `${p.hypothesisCount}개 가설 · ${p.activeHypothesisCount}개 활성`,
      href: '/architect',
    },
    {
      module: 'M4',
      label:  '초고 작성',
      score:  Math.min(100, Math.round(
        (Math.min(p.draftCount, 1)      / 1) * 50 +
        (Math.min(p.readyDraftCount, 1) / 1) * 50
      )),
      detail: `${p.draftCount}개 초고 · ${p.readyDraftCount}개 제출 준비`,
      href: '/draft',
    },
    {
      module: 'M5',
      label:  '도표·데이터',
      score:  Math.min(100, Math.round(
        (Math.min(p.figureCount, 4)      / 4) * 50 +
        (Math.min(p.finalFigureCount, 2) / 2) * 50
      )),
      detail: `${p.figureCount}개 계획 · ${p.finalFigureCount}개 최종본`,
      href: '/figures',
    },
    {
      module: 'M6',
      label:  '레드팀',
      score:  Math.min(100, Math.round(
        (Math.min(p.reviewCount, 5)          / 5) * 40 +
        (Math.min(p.resolvedReviewCount, 5)  / 5) * 60
      )),
      detail: `${p.reviewCount}개 리뷰 · ${p.resolvedReviewCount}개 해결`,
      href: '/redteam',
    },
  ]
}

// ── 단계 정의 ─────────────────────────────────────────────

interface Step {
  id: string
  module: string
  phase: string
  title: string
  description: string
  href: string
  done: boolean
  current?: number
  target?: number
}

function buildSteps(p: Progress, tracks: Track[], intent: string | null): Step[] {
  const topic = intent
    ? `"${intent.length > 40 ? intent.slice(0, 40) + '…' : intent}"`
    : null

  return [
    {
      id: 'tracks',
      module: 'M0',
      phase: '기초',
      title: '연구 트랙 설정',
      description: topic
        ? `${topic} 아이디어를 구체적인 연구 주제별로 트랙을 만들어 나누세요.`
        : '프로젝트 아이디어를 구체적인 연구 주제(트랙)로 분리해 관리하세요.',
      href: '/tracks',
      done: tracks.length > 0,
      current: tracks.length,
      target: 1,
    },
    {
      id: 'ref-papers',
      module: 'M0',
      phase: '기초',
      title: '선행 연구 수집',
      description: topic
        ? `${topic} 관련 선행 연구를 5편 이상 수집하고, 핵심 논문을 선정하세요.`
        : '관련 선행 연구를 5편 이상 수집하고 핵심 논문(key)을 선정하세요.',
      href: '/reference-papers',
      done: p.refPaperCount >= 5 && p.keyPaperCount >= 1,
      current: p.refPaperCount,
      target: 5,
    },
    {
      id: 'journals',
      module: 'M1',
      phase: '전략',
      title: '저널 후보 선정',
      description: topic
        ? `${topic} 를 발표할 적합한 저널 후보를 2개 이상 shortlist에 등록하세요.`
        : '투고할 저널 후보를 2개 이상 shortlist에 등록하고 전략을 세우세요.',
      href: '/journal',
      done: p.shortlistedCount >= 2,
      current: p.shortlistedCount,
      target: 2,
    },
    {
      id: 'hypotheses',
      module: 'M3',
      phase: '논증',
      title: '연구 가설 정의',
      description: topic
        ? `${topic} 를 검증하기 위한 핵심 가설을 최소 1개 이상 active로 설정하세요.`
        : '연구의 핵심 가설을 정의하고 active 상태로 전환하세요.',
      href: '/architect',
      done: p.activeHypothesisCount >= 1,
      current: p.activeHypothesisCount,
      target: 1,
    },
    {
      id: 'assets',
      module: 'M2',
      phase: '논증',
      title: '핵심 자산 수집',
      description: '인용구, 실험 데이터, 그림 등 논문에 활용할 자산을 3개 이상 저장하세요.',
      href: '/assets',
      done: p.assetCount >= 3,
      current: p.assetCount,
      target: 3,
    },
    {
      id: 'draft',
      module: 'M4',
      phase: '집필',
      title: '초고 작성 시작',
      description: '아웃라인부터 시작해 초고를 만들어 보세요. 완벽하지 않아도 됩니다.',
      href: '/draft',
      done: p.draftCount >= 1,
      current: p.draftCount,
      target: 1,
    },
    {
      id: 'figures',
      module: 'M5',
      phase: '집필',
      title: '그림 & 데이터 계획',
      description: '논문에 필요한 그림과 차트를 미리 계획하고 제작 진행 상태를 추적하세요.',
      href: '/figures',
      done: p.figureCount >= 1,
      current: p.figureCount,
      target: 1,
    },
    {
      id: 'redteam',
      module: 'M6',
      phase: '검토',
      title: 'Red Team 리뷰',
      description: '가상 리뷰어 관점에서 초고를 비판하고 약점을 보완해 완성도를 높이세요.',
      href: '/redteam',
      done: p.reviewCount >= 3,
      current: p.reviewCount,
      target: 3,
    },
  ]
}

// ── 모듈 파이프라인 상태 ───────────────────────────────────

function getPipelineStatus(steps: Step[]) {
  return [
    { id: 0, label: '주제\n관리',       stepIds: ['tracks', 'ref-papers'],    href: '/dashboard' },
    { id: 1, label: '저널\n인텔리전스', stepIds: ['journals'],                href: '/journal' },
    { id: 2, label: '자산\n라이브러리', stepIds: ['assets'],                  href: '/assets' },
    { id: 3, label: '논증\n설계',        stepIds: ['hypotheses'],              href: '/architect' },
    { id: 4, label: '초고\n공장',        stepIds: ['draft'],                   href: '/draft' },
    { id: 5, label: '그림\n& 데이터',   stepIds: ['figures'],                 href: '/figures' },
    { id: 6, label: '레드팀\n& 제출',    stepIds: ['redteam'],                 href: '/redteam' },
  ].map((mod) => ({
    ...mod,
    done:   mod.stepIds.every((id) => steps.find((s) => s.id === id)?.done),
    active: mod.stepIds.some((id) => !steps.find((s) => s.id === id)?.done),
  }))
}

// ── 페이지 ────────────────────────────────────────────────

export default async function DashboardPage() {
  const selectedProjectId = await getSelectedProjectId()

  if (!selectedProjectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <p className="text-4xl">🔬</p>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">프로젝트를 선택하세요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            왼쪽 사이드바에서 프로젝트를 선택하거나 새 프로젝트를 만들어 시작하세요.
          </p>
        </div>
        <ProjectDialog
          trigger={
            <button className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 새 프로젝트 만들기
            </button>
          }
        />
      </div>
    )
  }

  const [project, tracks] = await Promise.all([
    getProject(selectedProjectId),
    getTracks(selectedProjectId),
  ])

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const trackIds  = tracks.map((t) => t.id)
  const progress  = await fetchProgress(selectedProjectId, trackIds)
  const steps     = buildSteps(progress, tracks, project.research_intent)
  const pipeline  = getPipelineStatus(steps)
  const readiness = calcReadiness(progress)
  const overallReadiness = Math.round(readiness.reduce((s, r) => s + r.score, 0) / readiness.length)

  const doneSteps    = steps.filter((s) => s.done)
  const pendingSteps = steps.filter((s) => !s.done)
  const nextSteps    = pendingSteps.slice(0, 3)
  const totalDone    = doneSteps.length
  const progressPct  = Math.round((totalDone / steps.length) * 100)

  const guideState = computeGuideState(progress, {
    researchIntent: project.research_intent,
    trackCount:     tracks.length,
  })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 프로젝트 헤더 */}
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-zinc-100">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.research_intent && (
              <p className="mt-1.5 max-w-2xl text-sm text-zinc-400 leading-relaxed">
                <span className="text-zinc-600 text-xs mr-1.5 font-medium uppercase tracking-wide">Research Intent</span>
                {project.research_intent}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/insights"
              className="rounded border border-indigo-800/50 bg-indigo-900/20 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-300 transition-colors"
            >
              ✦ Framework Insights
            </Link>
            <ProjectDialog
              project={project}
              trigger={
                <button className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                  편집
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* 프레임워크 핵심 (전역 철학 — AI 알고리즘과 동일 원칙) */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-8 py-3">
        <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl">
          <span className="font-medium text-indigo-400">
            {FRAMEWORK_MASTER_INSIGHT.title}
          </span>
          <span className="text-zinc-600"> · </span>
          {FRAMEWORK_MASTER_INSIGHT.splitRatio}
          <span className="text-zinc-600"> · </span>
          <Link
            href="/insights"
            className="text-indigo-500 hover:text-indigo-400 underline-offset-2 hover:underline"
          >
            상세
          </Link>
        </p>
      </div>

      <div className="flex-1 px-8 py-6 space-y-8">

        {/* AI 가이드 카드 */}
        <GuideCard state={guideState} researchIntent={project.research_intent} />

        {/* 지금 해야 할 일 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">다음 할 일</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500">{totalDone}/{steps.length} 완료</span>
              </div>
            </div>
          </div>

          {nextSteps.length === 0 ? (
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-6 py-8 text-center">
              <p className="text-2xl">🎉</p>
              <p className="mt-2 text-sm font-medium text-emerald-400">모든 단계를 완료했습니다!</p>
              <p className="mt-1 text-xs text-zinc-500">논문 제출 준비가 되었습니다.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {nextSteps.map((step, i) => (
                <div
                  key={step.id}
                  className={`rounded-xl border px-5 py-4 transition-colors ${
                    i === 0
                      ? 'border-indigo-700 bg-indigo-950/50'
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 우선순위 번호 */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          i === 0 ? 'bg-indigo-800 text-indigo-300' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {step.module}
                        </span>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{step.phase}</span>
                      </div>
                      <p className={`text-sm font-semibold ${i === 0 ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                        {step.description}
                      </p>
                      {step.current !== undefined && step.target !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 w-24 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-zinc-600'}`}
                              style={{ width: `${Math.min((step.current / step.target) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-600">
                            {step.current} / {step.target}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={step.href}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        i === 0
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                          : 'border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      시작하기 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 대기 중인 다음 단계 */}
          {pendingSteps.length > 3 && (
            <div className="mt-2 px-1">
              <p className="text-xs text-zinc-700">
                다음 단계: {pendingSteps.slice(3).map((s) => s.title).join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* 완료된 단계 */}
        {doneSteps.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-500">완료된 항목</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {doneSteps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="group flex items-center gap-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-3 py-2.5 hover:border-zinc-700 transition-colors"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900">
                    <span className="text-emerald-400 text-[10px]">✓</span>
                  </span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{step.title}</span>
                  <span className="ml-auto text-[10px] text-zinc-700">{step.module}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 단계별 충실도 (Publication Readiness) */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">단계별 충실도</h2>
              <p className="mt-0.5 text-xs text-zinc-600">각 단계가 얼마나 충실하게 이행되었는지 평가</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-700 flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-400">{overallReadiness}</span>
              </div>
              <span className="text-xs text-zinc-500">종합</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {readiness.map((r) => (
              <a key={r.module} href={r.href} className="group rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-3 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-500">{r.module}</span>
                  <span className={`text-[10px] font-bold ${
                    r.score >= 80 ? 'text-emerald-400' :
                    r.score >= 50 ? 'text-amber-400'   :
                    r.score >  0  ? 'text-indigo-400'  :
                                    'text-zinc-700'
                  }`}>{r.score}</span>
                </div>
                {/* Score bar */}
                <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      r.score >= 80 ? 'bg-emerald-500' :
                      r.score >= 50 ? 'bg-amber-500'   :
                      r.score >  0  ? 'bg-indigo-500'  :
                                      'bg-zinc-700'
                    }`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <p className="text-[9px] leading-tight text-zinc-600 group-hover:text-zinc-500 whitespace-pre-line">{r.label}</p>
                <p className="mt-1 text-[9px] text-zinc-700 hidden group-hover:block">{r.detail}</p>
              </a>
            ))}
          </div>
        </div>

        {/* 모듈 파이프라인 */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">모듈 파이프라인</h2>
          <div className="grid grid-cols-7 gap-2">
            {pipeline.map((mod, i) => (
              <Link key={mod.id} href={mod.href} className="group relative">
                {i > 0 && (
                  <div className={`absolute top-4 -left-1 h-px w-2 ${mod.done ? 'bg-emerald-800' : 'bg-zinc-800'}`} />
                )}
                <div className={`rounded-lg border px-2 py-3 text-center transition-colors ${
                  mod.done
                    ? 'border-emerald-800 bg-emerald-950/50 group-hover:border-emerald-700'
                    : mod.active
                    ? 'border-indigo-700 bg-indigo-950/60 group-hover:border-indigo-600'
                    : 'border-zinc-800 bg-zinc-900 group-hover:border-zinc-700'
                }`}>
                  <p className={`text-[10px] font-bold ${
                    mod.done ? 'text-emerald-400' : mod.active ? 'text-indigo-400' : 'text-zinc-700'
                  }`}>
                    {mod.done ? '✓' : `M${mod.id}`}
                  </p>
                  <p className={`mt-1 whitespace-pre-line text-[10px] leading-tight ${
                    mod.done ? 'text-emerald-600' : mod.active ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>
                    {mod.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 트랙 현황 */}
        {tracks.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500">연구 트랙</h2>
              <Link href="/tracks" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {tracks.filter((t) => t.status === 'active').slice(0, 4).map((track) => (
                <Link
                  key={track.id}
                  href={`/tracks/${track.id}`}
                  className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
                >
                  <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100">
                      {track.name}
                    </p>
                    {track.research_intent && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">{track.research_intent}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <TrackStatusBadge status={track.status} />
                      {track.parent_track_id && (
                        <span className="text-[10px] text-zinc-700">
                          {track.relation_type === 'sequential' ? '후속' : '병렬'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
