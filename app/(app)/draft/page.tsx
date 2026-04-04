import Link from 'next/link'
import { getDrafts } from '@/lib/actions/drafts'
import { getTracks } from '@/lib/actions/tracks'
import { getJournals } from '@/lib/actions/journals'
import { getSelectedProjectId } from '@/lib/selected-project'
import { getSelectedTrackId } from '@/lib/selected-track'
import { DraftStatusBadge, TagBadge } from '@/components/ui/badge'
import { DraftDialog } from '@/components/module4/draft-dialog'
import { TrackContextBanner } from '@/components/layout/track-context-banner'
import type { DraftStatus } from '@/lib/types'

export const metadata = { title: 'Draft Factory — PaperFactory' }

const STATUS_ORDER: DraftStatus[] = ['drafting', 'revising', 'outline', 'ready', 'submitted']

export default async function DraftPage() {
  const selectedProjectId = await getSelectedProjectId()
  const [tracks, journals, selectedTrackId] = await Promise.all([
    getTracks(selectedProjectId),
    getJournals(selectedProjectId),
    getSelectedTrackId(),
  ])

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null

  const drafts = await getDrafts(
    selectedTrack
      ? { trackId: selectedTrack.id }
      : { projectId: selectedProjectId ?? undefined },
  )

  const grouped = STATUS_ORDER.reduce<Record<string, typeof drafts>>((acc, s) => {
    acc[s] = drafts.filter((d) => d.status === s)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">초고 공장</h1>
          <p className="mt-0.5 text-sm text-zinc-500">M4 · 논문 초고 작성</p>
        </div>
        <DraftDialog
          tracks={tracks}
          journals={journals}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 새 초고
            </button>
          }
        />
      </div>

      <TrackContextBanner
        selectedTrack={selectedTrack}
        totalCount={drafts.length}
        label="초고"
      />

      <div className="flex-1 px-8 py-6">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">
              {selectedTrack ? `"${selectedTrack.name}" 트랙의 초고가 없습니다.` : '초고가 없습니다.'}
            </p>
            <p className="mt-1 text-xs text-zinc-700">새 논문 초고를 시작해보세요.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {STATUS_ORDER.map((status) => {
              const group = grouped[status]
              if (group.length === 0) return null
              return (
                <div key={status}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    {status} · {group.length}
                  </p>
                  <div className="space-y-1.5">
                    {group.map((draft) => (
                      <Link
                        key={draft.id}
                        href={`/draft/${draft.id}`}
                        className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
                      >
                        {draft.track ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: draft.track.color }} />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">{draft.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                            {draft.journal && <span>{draft.journal.name}</span>}
                            {draft.word_count != null && <span>· {draft.word_count.toLocaleString()} words</span>}
                            {draft.track && <span className="text-zinc-700">· {draft.track.name}</span>}
                          </div>
                          {draft.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {draft.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                            </div>
                          )}
                        </div>
                        <DraftStatusBadge status={draft.status} />
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
