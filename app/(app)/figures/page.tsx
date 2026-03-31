import Link from 'next/link'
import { getFigures } from '@/lib/actions/figures'
import { getTracks } from '@/lib/actions/tracks'
import { getDrafts } from '@/lib/actions/drafts'
import { getSelectedProjectId } from '@/lib/selected-project'
import { FigureStatusBadge, FigureTypeBadge, TagBadge } from '@/components/ui/badge'
import { FigureDialog } from '@/components/module5/figure-dialog'
import type { FigureStatus } from '@/lib/types'

export const metadata = { title: 'Figure & Data — Academic Factory' }

const STATUS_ORDER: FigureStatus[] = ['draft', 'planned', 'final']

export default async function FiguresPage() {
  const selectedProjectId = await getSelectedProjectId()
  const [figures, tracks, drafts] = await Promise.all([
    getFigures({ projectId: selectedProjectId ?? undefined }),
    getTracks(selectedProjectId),
    getDrafts({ projectId: selectedProjectId ?? undefined }),
  ])

  const grouped = STATUS_ORDER.reduce<Record<string, typeof figures>>((acc, s) => {
    acc[s] = figures.filter((f) => f.status === s)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">그림 & 데이터</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{figures.length}개 그림</p>
        </div>
        <FigureDialog
          tracks={tracks}
          drafts={drafts}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 그림 추가
            </button>
          }
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {figures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">그림이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">논문에 들어갈 그림을 계획하고 추적하세요.</p>
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
                    {group.map((figure) => (
                      <Link
                        key={figure.id}
                        href={`/figures/${figure.id}`}
                        className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
                      >
                        {figure.track ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: figure.track.color }} />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">{figure.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                            {figure.caption && <span className="truncate max-w-xs">{figure.caption}</span>}
                            {figure.draft && <span className="text-zinc-700">· {figure.draft.title}</span>}
                          </div>
                          {figure.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {figure.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <FigureTypeBadge type={figure.type} />
                          <FigureStatusBadge status={figure.status} />
                        </div>
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
