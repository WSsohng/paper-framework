import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrack } from '@/lib/actions/tracks'
import { getProject } from '@/lib/actions/projects'
import { getReferencePapers } from '@/lib/actions/reference-papers'
import { getTrackRelevances } from '@/lib/actions/reference-paper-tracks'
import {
  TrackStatusBadge,
  TrackStageBadge,
  TagBadge,
  PaperTierBadge,
} from '@/components/ui/badge'
import { RelevanceBadge } from '@/components/module0/relevance-badge'
import { TrackDialog } from '@/components/module0/track-dialog'
import { TimelinessPanel } from '@/components/module0/timeliness-panel'
import type { ReferencePaper, RelevanceLevel } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const track = await getTrack(id)
  return { title: track ? `${track.name} — PaperFactory` : 'Track Not Found' }
}

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const track = await getTrack(id)
  if (!track) notFound()

  const project = track.project_id ? await getProject(track.project_id) : null

  const [refPapers, relevances] = track.project_id
    ? await Promise.all([
        getReferencePapers(track.project_id),
        getTrackRelevances(track.project_id, track.id),
      ])
    : [[], []]

  // R레벨 매핑 + 연관 논문 목록 구성
  const relevanceByPaperId = new Map<string, RelevanceLevel>(
    relevances.map((r) => [r.reference_paper_id, r.relevance_level]),
  )
  const paperById = new Map<string, ReferencePaper>(refPapers.map((p) => [p.id, p]))

  const relevantPapers: { paper: ReferencePaper; level: RelevanceLevel }[] = []
  for (const [paperId, level] of relevanceByPaperId) {
    const paper = paperById.get(paperId)
    if (paper) relevantPapers.push({ paper, level })
  }

  const relevanceGroups: Record<1 | 2 | 3, typeof relevantPapers> = {
    1: relevantPapers.filter((r) => r.level === 1),
    2: relevantPapers.filter((r) => r.level === 2),
    3: relevantPapers.filter((r) => r.level === 3),
  }

  const tier1Papers = refPapers
    .filter((p) => p.tier === 1)
    .map((p) => ({ title: p.title, year: p.year, journal: p.journal }))

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span
              className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: track.color }}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-zinc-100">{track.name}</h1>
                <TrackStatusBadge status={track.status} />
                <TrackStageBadge stage={track.current_stage} />
              </div>
              {track.description && (
                <p className="mt-1 text-sm text-zinc-500">{track.description}</p>
              )}
              {(track.experiment_start_date || track.target_submit_date) && (
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-600">
                  {track.experiment_start_date && (
                    <span>실험 시작: <span className="text-zinc-400">{track.experiment_start_date}</span></span>
                  )}
                  {track.target_submit_date && (
                    <span>투고 목표: <span className="text-amber-400 font-medium">{track.target_submit_date}</span></span>
                  )}
                </div>
              )}
              {track.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {track.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <TrackDialog
              track={track}
              trigger={
                <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  수정
                </button>
              }
            />
          </div>
        </div>

        <div className="mt-4 flex gap-6 text-sm text-zinc-600">
          <span>연관 참고문헌 {relevantPapers.length}편</span>
          <span className="text-emerald-500">R1 {relevanceGroups[1].length}</span>
          <span className="text-sky-500">R2 {relevanceGroups[2].length}</span>
          <span className="text-zinc-500">R3 {relevanceGroups[3].length}</span>
        </div>
      </div>

      {/* 시의성 & Flow 패널 */}
      <div className="border-b border-zinc-800 px-8 py-5">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors select-none">
            <span className="text-indigo-500 text-xs">◆</span>
            시의성 · 실험 일정 · 논문 작성 단계
            <span className="ml-1 text-xs text-zinc-700 group-open:hidden">펼치기</span>
            <span className="ml-1 text-xs text-zinc-700 hidden group-open:inline">접기</span>
          </summary>
          <div className="mt-4">
            <TimelinessPanel
              trackId={track.id}
              projectName={project?.name ?? ''}
              researchIntent={project?.research_intent ?? track.research_intent ?? ''}
              tier1Papers={tier1Papers}
              experimentStartDate={track.experiment_start_date}
              targetSubmitDate={track.target_submit_date}
              currentStage={track.current_stage}
            />
          </div>
        </details>
      </div>

      {/* 연관 참고문헌 (R1/R2/R3) */}
      <div className="flex-1 px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            이 트랙과 태깅된 참고문헌. 편집·태그 추가는{' '}
            <Link href="/reference-papers" className="text-indigo-400 hover:text-indigo-300">
              /reference-papers
            </Link>{' '}
            에서 관리합니다.
          </p>
        </div>

        {relevantPapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">이 트랙에 태깅된 참고문헌이 없습니다.</p>
            <Link
              href="/reference-papers"
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
            >
              참고문헌 페이지에서 R레벨 태깅 →
            </Link>
          </div>
        ) : (
          ([1, 2, 3] as const).map((level) => {
            const group = relevanceGroups[level]
            if (group.length === 0) return null
            const levelLabel = level === 1 ? '핵심 연관' : level === 2 ? '부분 연관' : '배경 연관'
            return (
              <div key={level}>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  <RelevanceBadge level={level} />
                  <span>{levelLabel} · {group.length}</span>
                </p>
                <div className="space-y-1.5">
                  {group.map(({ paper }) => (
                    <Link
                      key={paper.id}
                      href={`/reference-papers/${paper.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
                          {paper.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {paper.authors.slice(0, 3).join(', ')}
                          {paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ''}
                          {paper.journal && ` · ${paper.journal}`}
                          {paper.year && ` · ${paper.year}`}
                        </p>
                      </div>
                      <PaperTierBadge tier={paper.tier ?? null} />
                    </Link>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
