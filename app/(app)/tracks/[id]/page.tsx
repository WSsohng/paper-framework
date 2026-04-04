import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrack } from '@/lib/actions/tracks'
import { getPapers } from '@/lib/actions/papers'
import { getProject } from '@/lib/actions/projects'
import { getReferencePapers } from '@/lib/actions/reference-papers'
import { TrackStatusBadge, TrackStageBadge, PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { TrackDialog } from '@/components/module0/track-dialog'
import { PaperDialog } from '@/components/module0/paper-dialog'
import { TimelinessPanel } from '@/components/module0/timeliness-panel'

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
  const [track, papers] = await Promise.all([getTrack(id), getPapers(id)])

  if (!track) notFound()

  // 시의성 패널을 위한 데이터
  const project = track.project_id ? await getProject(track.project_id) : null
  const refPapers = track.project_id ? await getReferencePapers(track.project_id) : []
  const tier1Papers = refPapers
    .filter((p) => p.tier === 1)
    .map((p) => ({ title: p.title, year: p.year, journal: p.journal }))

  const statusGroups = {
    key:      papers.filter((p) => p.status === 'key'),
    reading:  papers.filter((p) => p.status === 'reading'),
    unread:   papers.filter((p) => p.status === 'unread'),
    read:     papers.filter((p) => p.status === 'read'),
    archived: papers.filter((p) => p.status === 'archived'),
  }

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
              {/* 실험 일정 요약 */}
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
            <PaperDialog
              trackId={track.id}
              trigger={
                <button className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                  + 논문 추가
                </button>
              }
            />
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
          <span>전체 {papers.length}편</span>
          <span>핵심 {statusGroups.key.length}</span>
          <span>읽는중 {statusGroups.reading.length}</span>
          <span>미읽음 {statusGroups.unread.length}</span>
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

      {/* Papers */}
      <div className="flex-1 px-8 py-6 space-y-6">
        {papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">이 트랙에 논문이 없습니다.</p>
            <PaperDialog
              trackId={track.id}
              trigger={
                <button className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
                  첫 번째 논문 추가 →
                </button>
              }
            />
          </div>
        ) : (
          Object.entries(statusGroups).map(([status, group]) => {
            if (group.length === 0) return null
            return (
              <div key={status}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  {status} · {group.length}
                </p>
                <div className="space-y-1.5">
                  {group.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/papers/${paper.id}`}
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
                      <PaperStatusBadge status={paper.status} />
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
