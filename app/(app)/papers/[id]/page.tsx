import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPaper } from '@/lib/actions/papers'
import { getTracks } from '@/lib/actions/tracks'
import { PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { PaperDialog } from '@/components/module0/paper-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await getPaper(id)
  return { title: paper ? `${paper.title} — Academic Factory` : 'Paper Not Found' }
}

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [paper, tracks] = await Promise.all([getPaper(id), getTracks()])

  if (!paper) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {paper.track && (
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: paper.track.color }}
                />
              )}
              <h1 className="text-lg font-semibold text-zinc-100 leading-snug">{paper.title}</h1>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              {paper.authors.length > 0 && <span>{paper.authors.join(', ')}</span>}
              {paper.journal && <span>· {paper.journal}</span>}
              {paper.year && <span>· {paper.year}</span>}
              {paper.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  DOI ↗
                </a>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PaperStatusBadge status={paper.status} />
            <PaperDialog
              paper={paper}
              tracks={tracks}
              trigger={
                <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  수정
                </button>
              }
            />
          </div>
        </div>

        {/* Track breadcrumb */}
        {paper.track && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600">
            <Link href="/tracks" className="hover:text-zinc-400">트랙</Link>
            <span>/</span>
            <Link href={`/tracks/${paper.track.id}`} className="hover:text-zinc-400">
              {paper.track.name}
            </Link>
          </div>
        )}

        {paper.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {paper.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 max-w-3xl">
        {paper.abstract && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">ABSTRACT</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{paper.abstract}</p>
          </section>
        )}

        {paper.notes && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">메모</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{paper.notes}</p>
          </section>
        )}

        {!paper.abstract && !paper.notes && (
          <div className="py-12 text-center text-sm text-zinc-700">
            Abstract 또는 메모가 없습니다.
            <PaperDialog
              paper={paper}
              tracks={tracks}
              trigger={
                <button className="ml-2 text-indigo-400 hover:text-indigo-300">
                  지금 추가 →
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
