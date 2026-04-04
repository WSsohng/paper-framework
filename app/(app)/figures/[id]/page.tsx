import { notFound } from 'next/navigation'
import { getFigure } from '@/lib/actions/figures'
import { getTracks } from '@/lib/actions/tracks'
import { getDrafts } from '@/lib/actions/drafts'
import { getSelectedProjectId } from '@/lib/selected-project'
import { FigureStatusBadge, FigureTypeBadge, TagBadge } from '@/components/ui/badge'
import { FigureDialog } from '@/components/module5/figure-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const figure = await getFigure(id)
  return { title: figure ? `${figure.title} — PaperFactory` : 'Figure Not Found' }
}

export default async function FigureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const selectedProjectId = await getSelectedProjectId()
  const [figure, tracks, drafts] = await Promise.all([
    getFigure(id),
    getTracks(selectedProjectId),
    getDrafts({ projectId: selectedProjectId ?? undefined }),
  ])
  if (!figure) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {figure.track && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: figure.track.color }} />}
              <h1 className="text-lg font-semibold text-zinc-100">{figure.title}</h1>
            </div>
            {figure.caption && <p className="mt-1 text-sm text-zinc-500 italic">{figure.caption}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FigureTypeBadge type={figure.type} />
            <FigureStatusBadge status={figure.status} />
            <FigureDialog figure={figure} tracks={tracks} drafts={drafts} trigger={
              <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">수정</button>
            } />
          </div>
        </div>
        {figure.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {figure.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-6 space-y-6 max-w-3xl">
        {figure.file_url && (
          <div>
            <a href={figure.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              파일 보기 ↗
            </a>
          </div>
        )}
        {figure.description && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">설명</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{figure.description}</p>
          </section>
        )}
        {!figure.description && !figure.file_url && (
          <div className="py-12 text-center text-sm text-zinc-700">
            설명이 없습니다.
            <FigureDialog figure={figure} tracks={tracks} drafts={drafts} trigger={
              <button className="ml-2 text-indigo-400 hover:text-indigo-300">지금 추가 →</button>
            } />
          </div>
        )}
      </div>
    </div>
  )
}
