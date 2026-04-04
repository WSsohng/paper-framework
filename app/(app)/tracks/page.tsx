import Link from 'next/link'
import { getTracks } from '@/lib/actions/tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { TrackStatusBadge, TagBadge } from '@/components/ui/badge'
import { TrackDialog } from '@/components/module0/track-dialog'

export const metadata = { title: 'Tracks — PaperFactory' }

export default async function TracksPage() {
  const selectedProjectId = await getSelectedProjectId()
  const tracks = await getTracks(selectedProjectId)
  const rootTracks = tracks.filter((t) => !t.parent_track_id)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">연구 트랙</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{tracks.length}개 트랙</p>
        </div>
        <TrackDialog
          projectId={selectedProjectId}
          siblingTracks={tracks}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 새 트랙
            </button>
          }
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">트랙이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">
              {selectedProjectId
                ? '이 프로젝트에 새 트랙을 추가해보세요.'
                : '사이드바에서 프로젝트를 먼저 선택하세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {rootTracks.map((root) => {
              const children = tracks.filter((t) => t.parent_track_id === root.id)
              return (
                <div key={root.id}>
                  <TrackRow track={root} projectId={selectedProjectId} allTracks={tracks} isChild={false} />
                  {children.map((child) => (
                    <div key={child.id} className="ml-6">
                      <TrackRow track={child} projectId={selectedProjectId} allTracks={tracks} isChild />
                    </div>
                  ))}
                </div>
              )
            })}
            {/* tracks without root (orphaned) */}
            {tracks
              .filter((t) => t.parent_track_id && !tracks.find((p) => p.id === t.parent_track_id))
              .map((t) => (
                <TrackRow key={t.id} track={t} projectId={selectedProjectId} allTracks={tracks} isChild={false} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TrackRow({
  track,
  projectId,
  allTracks,
  isChild,
}: {
  track: import('@/lib/types').Track
  projectId: string | null
  allTracks: import('@/lib/types').Track[]
  isChild: boolean
}) {
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 transition-colors">
      {isChild && (
        <span className="shrink-0 text-zinc-700 text-sm">└</span>
      )}
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: track.color }}
      />
      <Link href={`/tracks/${track.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
            {track.name}
          </p>
          {isChild && (
            <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
              {track.relation_type === 'sequential' ? '후속 연구' : '병렬 진행'}
            </span>
          )}
        </div>
        {track.research_intent && (
          <p className="mt-0.5 text-sm text-zinc-600 truncate">{track.research_intent}</p>
        )}
        {track.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {track.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </Link>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-zinc-600">{track.paper_count ?? 0}편 논문</span>
        <TrackStatusBadge status={track.status} />
        <TrackDialog
          track={track}
          projectId={projectId}
          siblingTracks={allTracks}
          trigger={
            <button className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition-all">
              수정
            </button>
          }
        />
      </div>
    </div>
  )
}
