import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrack } from '@/lib/actions/tracks'
import { getPapers } from '@/lib/actions/papers'
import { TrackStatusBadge, PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { TrackDialog } from '@/components/module0/track-dialog'
import { PaperDialog } from '@/components/module0/paper-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const track = await getTrack(id)
  return { title: track ? `${track.name} — Academic Factory` : 'Track Not Found' }
}

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [track, papers] = await Promise.all([getTrack(id), getPapers(id)])

  if (!track) notFound()

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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-zinc-100">{track.name}</h1>
                <TrackStatusBadge status={track.status} />
              </div>
              {track.description && (
                <p className="mt-1 text-sm text-zinc-500">{track.description}</p>
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
