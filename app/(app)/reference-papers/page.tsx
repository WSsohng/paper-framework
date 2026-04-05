import Link from 'next/link'
import { getReferencePapers } from '@/lib/actions/reference-papers'
import { getProject } from '@/lib/actions/projects'
import { getTrack } from '@/lib/actions/tracks'
import { getTrackRelevances } from '@/lib/actions/reference-paper-tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { getSelectedTrackId } from '@/lib/selected-track'
import { PaperStatusBadge, PaperTierBadge, PriorityScoreBadge, TagBadge, PAPER_TIER_DESC } from '@/components/ui/badge'
import { ReferencePaperDialog } from '@/components/module0/reference-paper-dialog'
import { LiteratureDiscoveryPanel } from '@/components/module0/literature-discovery-panel'
import { TierSelector } from '@/components/module0/tier-selector'
import { TierMonitorButton } from '@/components/module0/tier-monitor-button'
import { BatchAnalyzeButton } from '@/components/module0/batch-analyze-button'
import { ConceptExtractButton } from '@/components/module0/concept-extract-button'
import { ConceptChipList } from '@/components/ui/concept-chip'
import { ModuleGuideBar } from '@/components/guide/module-guide-bar'
import { RelevanceBadge } from '@/components/module0/relevance-badge'
import { RelevanceTagButton } from '@/components/module0/relevance-tag-button'
import { BatchRelevanceButton } from '@/components/module0/batch-relevance-button'
import { TrackMonitorButton } from '@/components/module0/track-monitor-button'
import type { TrackRelevance } from '@/lib/types'

export const metadata = { title: 'Reference Papers — PaperFactory' }

export default async function ReferencePapersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  // discover가 M0의 기본 뷰 (사이드바에서 ?view=discover로 진입)
  // view=list 로 명시할 때만 리스트 뷰로 전환
  const isDiscover = view !== 'list'

  const selectedProjectId = await getSelectedProjectId()
  const selectedTrackId   = await getSelectedTrackId()

  if (!selectedProjectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-zinc-500">사이드바에서 프로젝트를 먼저 선택하세요.</p>
      </div>
    )
  }

  const [papers, project, selectedTrack, trackRelevances] = await Promise.all([
    getReferencePapers(selectedProjectId),
    getProject(selectedProjectId),
    selectedTrackId ? getTrack(selectedTrackId) : Promise.resolve(null),
    selectedTrackId ? getTrackRelevances(selectedProjectId, selectedTrackId) : Promise.resolve([]),
  ])

  // R레벨 맵: paperId → TrackRelevance (트랙 선택 시만 의미있음)
  const relevanceMap = new Map<string, TrackRelevance>(
    trackRelevances.map(r => [r.reference_paper_id, r]),
  )

  const keyPapers    = papers.filter((p) => p.status === 'key')
  const activePapers = papers
    .filter((p) => p.status !== 'archived')
    .sort((a, b) => {
      if (selectedTrackId) {
        // 트랙 선택 시: R1→R2→R3→미태깅 우선, 동일 R레벨은 priority_score 내림차순
        const ra = relevanceMap.get(a.id)?.relevance_level ?? 4
        const rb = relevanceMap.get(b.id)?.relevance_level ?? 4
        if (ra !== rb) return ra - rb
      }
      return (b.priority_score ?? -1) - (a.priority_score ?? -1)
    })
  const tier1Papers  = papers.filter((p) => p.tier === 1)
  const tier2Papers  = papers.filter((p) => p.tier === 2)
  const tier3Papers  = papers.filter((p) => p.tier === 3)
  const unanalyzedCount       = papers.filter((p) => !p.concepts || p.concepts.length === 0).length
  const untaggedRelevanceCount = selectedTrackId
    ? activePapers.filter((p) => !relevanceMap.has(p.id)).length
    : 0

  // For discovery panel
  const existingDois   = new Set(papers.map((p) => p.doi).filter(Boolean) as string[])
  const existingPapers = papers.map((p) => ({
    title:   p.title,
    journal: p.journal,
    year:    p.year,
  }))

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            {isDiscover ? 'M0 · 연구 주제 발굴' : '수집된 참고문헌'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{papers.length}편 전체</span>
            {tier1Papers.length > 0 && (
              <span className="text-red-400 font-medium">T1 {tier1Papers.length}편</span>
            )}
            {tier2Papers.length > 0 && (
              <span className="text-amber-400">T2 {tier2Papers.length}편</span>
            )}
            {tier3Papers.length > 0 && (
              <span className="text-zinc-500">T3 {tier3Papers.length}편</span>
            )}
            <span className="text-zinc-700">· 프로젝트 공유</span>
            {selectedTrack && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border"
                style={{
                  color:            selectedTrack.color,
                  borderColor:      selectedTrack.color + '66',
                  backgroundColor:  selectedTrack.color + '18',
                }}
              >
                ◉ {selectedTrack.name} 트랙 선택됨
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 1티어 모니터링 새로고침 */}
          {tier1Papers.length > 0 && project?.research_intent && (
            <TierMonitorButton
              researchIntent={project.research_intent}
              tier1Papers={tier1Papers.map((p) => ({ title: p.title, doi: p.doi ?? null }))}
              existingDois={papers.map((p) => p.doi ?? '').filter(Boolean)}
            />
          )}
          <ReferencePaperDialog
            projectId={selectedProjectId}
            trigger={
              <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                + 논문 추가
              </button>
            }
          />
        </div>
      </div>

      {/* M0 가이드 바 */}
      <ModuleGuideBar
        moduleTag="M0"
        activeStepIndex={
          !project?.research_intent ? 0 :
          papers.length < 3          ? 2 :
          tier1Papers.length < 1     ? 4 :
          undefined
        }
      />

      {/* View tabs */}
      <div className="flex gap-0 border-b border-zinc-800 px-8">
        <Link
          href="/reference-papers?view=discover"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            isDiscover
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ✦ AI 문헌 탐색
        </Link>
        <Link
          href="/reference-papers?view=list"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            !isDiscover
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          수집된 논문
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {isDiscover ? (
          <LiteratureDiscoveryPanel
            projectId={selectedProjectId}
            projectName={project?.name ?? ''}
            researchIntent={project?.research_intent ?? null}
            existingDois={existingDois}
            existingPapers={existingPapers}
          />
        ) : (
          <>
            {/* 티어 범례 + 일괄 분석 / R태깅 버튼 */}
            {papers.length > 0 && (
              <div className="mb-4 space-y-3">
                {/* Tier 범례 + 개념 일괄 분석 */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">T (품질·임팩트)</span>
                  {([1, 2, 3] as const).map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        t === 1 ? 'bg-red-950 text-red-400 border border-red-800/50' :
                        t === 2 ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                                 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                      }`}>T{t}</span>
                      {PAPER_TIER_DESC[t].desc}
                    </span>
                  ))}
                  <span className="text-xs text-zinc-700">— 카드에서 직접 설정</span>
                </div>
                  {project?.research_intent && (
                    <BatchAnalyzeButton
                      projectId={selectedProjectId}
                      researchIntent={project.research_intent}
                      unanalyzedCount={unanalyzedCount}
                    />
                  )}
                </div>

                {/* 트랙 선택 시: R레벨 범례 + 일괄 R태깅 + 트랙 모니터링 */}
                {selectedTrack && selectedTrack.research_intent && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-medium text-zinc-400">
                          R (주제 연관성 · 트랙: {selectedTrack.name})
                        </span>
                        {([1, 2, 3] as const).map((r) => {
                          const counts = [
                            trackRelevances.filter(t => t.relevance_level === 1).length,
                            trackRelevances.filter(t => t.relevance_level === 2).length,
                            trackRelevances.filter(t => t.relevance_level === 3).length,
                          ]
                          const labels = ['핵심 연관', '부분 연관', '배경 연관']
                          const colors = [
                            'bg-emerald-100 text-emerald-800 border-emerald-300',
                            'bg-sky-100 text-sky-800 border-sky-300',
                            'bg-zinc-100 text-zinc-600 border-zinc-300',
                          ]
                          return (
                            <span key={r} className="flex items-center gap-1 text-xs text-zinc-600">
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono ${colors[r-1]}`}>
                                R{r}
                              </span>
                              {labels[r-1]}
                              {counts[r-1] > 0 && (
                                <span className="text-zinc-500">({counts[r-1]})</span>
                              )}
                            </span>
                          )
                        })}
                        {untaggedRelevanceCount > 0 && (
                          <span className="text-xs text-zinc-600">
                            미태깅 {untaggedRelevanceCount}편
                          </span>
                        )}
                      </div>
                      <BatchRelevanceButton
                        projectId={selectedProjectId}
                        trackId={selectedTrack.id}
                        trackName={selectedTrack.name}
                        trackResearchIntent={selectedTrack.research_intent}
                        untaggedCount={untaggedRelevanceCount}
                        totalCount={activePapers.length}
                      />
                    </div>
                    {/* 트랙 연관 논문 모니터링 (새로고침) */}
                    <TrackMonitorButton
                      trackId={selectedTrack.id}
                      trackName={selectedTrack.name}
                      trackResearchIntent={selectedTrack.research_intent}
                      projectId={selectedProjectId}
                      existingDois={papers.map(p => p.doi ?? '').filter(Boolean)}
                    />
                  </div>
                )}
              </div>
            )}

            {activePapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-sm text-zinc-500">참고문헌이 없습니다.</p>
                <p className="mt-1 text-xs text-zinc-700">
                  논문을 직접 추가하거나{' '}
                  <Link
                    href="/reference-papers?view=discover"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    AI 문헌 탐색
                  </Link>
                  을 이용하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activePapers.map((paper) => {
                  const paperRelevance = selectedTrackId ? relevanceMap.get(paper.id) ?? null : null
                  return (
                  <div
                    key={paper.id}
                    className={`group rounded-lg border bg-zinc-900 px-4 py-3.5 hover:border-zinc-700 transition-colors ${
                      paperRelevance?.relevance_level === 1
                        ? 'border-emerald-800/60 hover:border-emerald-700'
                        : paperRelevance?.relevance_level === 2
                        ? 'border-sky-800/50 hover:border-sky-700'
                        : 'border-zinc-800'
                    }`}
                  >
                    {/* 상단 행: Tier selector + 제목 + 배지들 */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <TierSelector paperId={paper.id} currentTier={paper.tier ?? null} />
                      </div>
                      <Link href={`/reference-papers/${paper.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
                          {paper.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                          {paper.authors.length > 0 && (
                            <span>
                              {paper.authors.slice(0, 3).join(', ')}
                              {paper.authors.length > 3 ? ' 외' : ''}
                            </span>
                          )}
                          {paper.journal && <span>· {paper.journal}</span>}
                          {paper.year    && <span>· {paper.year}</span>}
                          {paper.doi     && <span>· DOI: {paper.doi}</span>}
                        </div>
                        {paper.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {paper.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                          </div>
                        )}
                      </Link>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {/* 트랙 선택 시: R레벨 태그 버튼 */}
                        {selectedTrack && selectedTrack.research_intent && (
                          <RelevanceTagButton
                            paperId={paper.id}
                            trackId={selectedTrack.id}
                            trackResearchIntent={selectedTrack.research_intent}
                            projectId={selectedProjectId}
                            existing={paperRelevance}
                          />
                        )}
                        {/* 우선순위 점수 */}
                        <PriorityScoreBadge score={paper.priority_score ?? null} />
                        <div className="flex items-center gap-1.5">
                          <PaperTierBadge tier={paper.tier ?? null} />
                          <PaperStatusBadge status={paper.status} />
                        </div>
                      </div>
                    </div>

                    {/* 하단 행: 개념 태그 + AI 분석 버튼 */}
                    <div className="mt-2.5 flex items-center justify-between gap-3 pl-8">
                      <ConceptChipList concepts={paper.concepts ?? []} max={7} size="xs" />
                      {project?.research_intent && (
                        <ConceptExtractButton
                          paperId={paper.id}
                          researchIntent={project.research_intent}
                          hasAnalysis={(paper.concepts?.length ?? 0) > 0}
                        />
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
