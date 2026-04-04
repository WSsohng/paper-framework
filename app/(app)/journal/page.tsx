import { getJournals } from '@/lib/actions/journals'
import { getProject } from '@/lib/actions/projects'
import { getTracks } from '@/lib/actions/tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { JournalStatusBadge, TagBadge } from '@/components/ui/badge'
import { JournalDialog } from '@/components/module1/journal-dialog'
import { JournalAiPanel } from '@/components/module1/journal-ai-panel'
import { JournalTrackAnalysisButton } from '@/components/module1/journal-track-analysis-button'
import { ModuleGuideBar } from '@/components/guide/module-guide-bar'
import type { Journal, TrackFitAnalysis } from '@/lib/types'

export const metadata = { title: 'Journal Intel — PaperFactory' }

const STATUS_ORDER = ['shortlisted', 'considering', 'submitted', 'accepted', 'rejected', 'withdrawn'] as const

const STATUS_META: Record<string, { label: string; cardBorder: string; headerColor: string }> = {
  shortlisted: { label: '후보 (비교 검토)',  cardBorder: 'border-indigo-800/60',  headerColor: 'text-indigo-400' },
  considering: { label: '검토중',            cardBorder: 'border-zinc-700',        headerColor: 'text-zinc-400'   },
  submitted:   { label: '제출됨',            cardBorder: 'border-blue-800/60',     headerColor: 'text-blue-400'   },
  accepted:    { label: '게재승인',          cardBorder: 'border-emerald-800/60',  headerColor: 'text-emerald-400'},
  rejected:    { label: '게재거절',          cardBorder: 'border-red-900/60',      headerColor: 'text-red-500'    },
  withdrawn:   { label: '취하됨',            cardBorder: 'border-zinc-800',        headerColor: 'text-zinc-600'   },
}

// ── Impact Factor 색상 ─────────────────────────────────────
function IFBadge({ value }: { value: number | null }) {
  if (value == null) return null
  const cls =
    value >= 20 ? 'bg-violet-950 text-violet-300 border border-violet-800/50' :
    value >= 10 ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50' :
    value >= 5  ? 'bg-amber-950 text-amber-400 border border-amber-800/50'    :
                  'bg-zinc-800 text-zinc-400'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>
      IF {value.toFixed(1)}
    </span>
  )
}

// ── Fit 레벨 색상 설정 ────────────────────────────────────
const FIT_STYLE: Record<string, { bar: string; bg: string; text: string }> = {
  optimal:      { bar: 'bg-emerald-500', bg: 'bg-emerald-950/40 border-emerald-800/50', text: 'text-emerald-400' },
  adequate:     { bar: 'bg-amber-500',   bg: 'bg-amber-950/40 border-amber-800/50',     text: 'text-amber-400'   },
  insufficient: { bar: 'bg-red-600',     bg: 'bg-red-950/40 border-red-900/50',         text: 'text-red-400'     },
  excessive:    { bar: 'bg-violet-600',  bg: 'bg-violet-950/40 border-violet-800/50',   text: 'text-violet-400'  },
}
const FIT_LABEL: Record<string, string> = {
  optimal: '최적', adequate: '적절', insufficient: '부족', excessive: '과잉',
}

// ── 트랙 Fit 행 ───────────────────────────────────────────
function TrackFitRow({ analysis }: { analysis: TrackFitAnalysis }) {
  const style = FIT_STYLE[analysis.fit_level] ?? FIT_STYLE.adequate
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${style.bg}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: analysis.track_color }}
          />
          <span className="text-xs font-semibold text-zinc-200 truncate">{analysis.track_name}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${style.bg} ${style.text}`}>
          {FIT_LABEL[analysis.fit_level] ?? analysis.fit_level}
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-snug">{analysis.fit_reason}</p>
      <p className="mt-1 text-[9px] text-zinc-700">
        {new Date(analysis.analyzed_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 분석
      </p>
    </div>
  )
}

// ── 저널 카드 ─────────────────────────────────────────────
function JournalCard({
  journal,
  projectId,
  projectResearchIntent,
  tracks,
}: {
  journal:                Journal
  projectId?:             string | null
  projectResearchIntent?: string | null
  tracks:                 { id: string; name: string; color: string; research_intent: string | null }[]
}) {
  const meta = STATUS_META[journal.status] ?? STATUS_META.considering
  const analyses = journal.track_analyses ?? []

  // 분석된 트랙을 현재 트랙 목록과 대조해 유효한 것만 표시
  const validAnalyses = analyses.filter((a) => tracks.some((t) => t.id === a.track_id))
  const missingTracks = tracks.filter((t) => !analyses.some((a) => a.track_id === t.id))

  return (
    <div className={`flex flex-col rounded-xl border bg-zinc-900 ${meta.cardBorder}`}>
      {/* 카드 헤더 */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{journal.name}</h3>
            <JournalStatusBadge status={journal.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {journal.publisher && <span>{journal.publisher}</span>}
            {journal.issn && <span className="text-zinc-600">· ISSN {journal.issn}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <IFBadge value={journal.impact_factor} />
          <JournalDialog
            journal={journal}
            projectId={projectId}
            trigger={
              <button className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                수정
              </button>
            }
          />
        </div>
      </div>

      {/* Scope */}
      {journal.scope && (
        <div className="px-5 pb-3">
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{journal.scope}</p>
        </div>
      )}

      {/* Notes */}
      {journal.notes && (
        <div className="mx-5 border-t border-zinc-800/60 pt-2.5 pb-3">
          <p className="text-[11px] text-zinc-500 leading-relaxed">{journal.notes}</p>
        </div>
      )}

      {/* ── 트랙별 Fit 분석 ─────────────────────────────── */}
      {tracks.length > 0 && (
        <div className="border-t border-zinc-800/60 px-5 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                트랙별 Fit 분석
              </span>
              {validAnalyses.length > 0 && missingTracks.length > 0 && (
                <span className="text-[9px] text-amber-600">
                  {missingTracks.length}개 미분석
                </span>
              )}
            </div>
            <JournalTrackAnalysisButton
              journalId={journal.id}
              journalName={journal.name}
              journalScope={journal.scope}
              journalIF={journal.impact_factor}
              tracks={tracks}
              projectResearchIntent={projectResearchIntent ?? null}
              hasAnalysis={validAnalyses.length > 0}
            />
          </div>

          {validAnalyses.length > 0 ? (
            <div className="space-y-2">
              {validAnalyses.map((analysis) => (
                <TrackFitRow key={analysis.track_id} analysis={analysis} />
              ))}
            </div>
          ) : (
            <p className="py-2 text-[11px] text-zinc-700 italic text-center">
              ✦ AI 트랙 분석 버튼을 눌러 트랙별 적합도를 분석하세요
            </p>
          )}
        </div>
      )}

      {/* 링크 + 태그 */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-800/60 px-5 py-2.5">
        {journal.website && (
          <a
            href={journal.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            홈페이지 ↗
          </a>
        )}
        {journal.submission_url && (
          <a
            href={journal.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            투고 페이지 ↗
          </a>
        )}
        {journal.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
      </div>
    </div>
  )
}

// ── 페이지 ─────────────────────────────────────────────────
export default async function JournalPage() {
  const selectedProjectId = await getSelectedProjectId()
  const [journals, project, allTracks] = await Promise.all([
    getJournals(selectedProjectId),
    selectedProjectId ? getProject(selectedProjectId) : Promise.resolve(null),
    selectedProjectId ? getTracks(selectedProjectId) : Promise.resolve([]),
  ])

  // 활성 트랙만 분석 대상으로
  const activeTracks = allTracks
    .filter((t) => t.status === 'active')
    .map((t) => ({ id: t.id, name: t.name, color: t.color, research_intent: t.research_intent }))

  const grouped = STATUS_ORDER.reduce<Record<string, typeof journals>>((acc, s) => {
    acc[s] = journals.filter((j) => j.status === s)
    return acc
  }, {})

  const existingNames = journals.map((j) => j.name)

  const shortlisted = grouped['shortlisted'] ?? []
  const hasMultipleShortlisted = shortlisted.length >= 2

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">저널 인텔리전스</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {journals.length}개 저널
            {shortlisted.length >= 2 && (
              <span className="ml-2 text-indigo-400 text-xs font-medium">
                · 후보 {shortlisted.length}개 나란히 비교 가능
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <JournalAiPanel
              projectName={project.name}
              researchIntent={project.research_intent}
              projectId={selectedProjectId}
              existingNames={existingNames}
            />
          )}
          <JournalDialog
            projectId={selectedProjectId}
            trigger={
              <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                + 직접 추가
              </button>
            }
          />
        </div>
      </div>

      {/* M1 가이드 바 */}
      <ModuleGuideBar
        moduleTag="M1"
        activeStepIndex={
          journals.length === 0 ? 0 :
          shortlisted.length < 2 ? 3 :
          shortlisted.length < 3 ? 4 : undefined
        }
      />

      {/* Research Intent 힌트 */}
      {project && !project.research_intent && (
        <div className="mx-8 mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3">
          <p className="text-xs text-amber-600">
            💡 프로젝트에 <strong>Research Intent</strong>를 추가하면 AI가 더 정확한 저널을 추천해 드립니다.
          </p>
        </div>
      )}

      {/* 저널 카드 목록 */}
      <div className="flex-1 px-8 py-6">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <p className="text-sm text-zinc-500">아직 저널이 없습니다.</p>
            <p className="text-xs text-zinc-700">
              {selectedProjectId
                ? project?.research_intent
                  ? '상단의 ✦ AI 저널 추천으로 자동 후보를 받거나, + 직접 추가에서 저널명을 검색해 보세요.'
                  : '직접 추가하거나 프로젝트에 Research Intent를 설정하면 AI 추천을 받을 수 있습니다.'
                : '사이드바에서 프로젝트를 먼저 선택하세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {STATUS_ORDER.map((status) => {
              const group = grouped[status]
              if (!group || group.length === 0) return null

              const meta = STATUS_META[status]
              const isShortlisted = status === 'shortlisted'

              return (
                <section key={status}>
                  {/* 섹션 헤더 */}
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className={`text-xs font-semibold uppercase tracking-widest ${meta.headerColor}`}>
                      {meta.label} · {group.length}
                    </h2>
                    {isShortlisted && hasMultipleShortlisted && (
                      <span className="rounded-full bg-indigo-950 border border-indigo-800/50 px-2.5 py-0.5 text-[10px] text-indigo-400">
                        카드를 나란히 보며 비교하세요
                      </span>
                    )}
                  </div>

                  {/* 카드 그리드: shortlisted/considering는 2열, 나머지는 1열 */}
                  <div className={
                    (isShortlisted || status === 'considering') && group.length >= 2
                      ? 'grid grid-cols-2 gap-4'
                      : 'grid grid-cols-1 gap-3'
                  }>
                    {group.map((journal) => (
                      <JournalCard
                        key={journal.id}
                        journal={journal}
                        projectId={selectedProjectId}
                        projectResearchIntent={project?.research_intent}
                        tracks={activeTracks}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
