import Link from 'next/link'
import { getPapers } from '@/lib/actions/papers'
import { getTracks } from '@/lib/actions/tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { PaperDialog } from '@/components/module0/paper-dialog'

export const metadata = { title: 'Papers — PaperFactory' }

export default async function PapersPage() {
  const selectedProjectId = await getSelectedProjectId()
  const tracks = await getTracks(selectedProjectId)
  const papers = await getPapers()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">논문</h1>
          <p className="mt-0.5 text-sm text-zinc-500">전체 트랙 {papers.length}편</p>
        </div>
        <PaperDialog
          tracks={tracks}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 논문 추가
            </button>
          }
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-8 py-6">
        {papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">논문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {papers.map((paper) => (
              <Link
                key={paper.id}
                href={`/papers/${paper.id}`}
                className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
              >
                {/* Track color indicator */}
                {paper.track ? (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: paper.track.color }}
                  />
                ) : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
                    {paper.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    {paper.authors.length > 0 && (
                      <span>
                        {paper.authors.slice(0, 2).join(', ')}
                        {paper.authors.length > 2 && ` +${paper.authors.length - 2}`}
                      </span>
                    )}
                    {paper.journal && <span>· {paper.journal}</span>}
                    {paper.year && <span>· {paper.year}</span>}
                    {paper.track && (
                      <span className="text-zinc-700">· {paper.track.name}</span>
                    )}
                  </div>
                  {paper.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {paper.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                    </div>
                  )}
                </div>

                <PaperStatusBadge status={paper.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
