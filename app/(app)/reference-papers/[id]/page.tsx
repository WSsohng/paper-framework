import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getReferencePaper, deleteReferencePaper } from '@/lib/actions/reference-papers'
import { PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { ReferencePaperDialog } from '@/components/module0/reference-paper-dialog'

interface Props { params: Promise<{ id: string }> }

export default async function ReferencePaperDetailPage({ params }: Props) {
  const { id } = await params
  const paper = await getReferencePaper(id)
  if (!paper) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-zinc-600 mb-2">
              <Link href="/reference-papers" className="hover:text-zinc-400 transition-colors">
                ← 참고문헌 목록
              </Link>
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 leading-snug">{paper.title}</h1>
            {paper.authors.length > 0 && (
              <p className="mt-1 text-sm text-zinc-500">{paper.authors.join(', ')}</p>
            )}
          </div>
          <PaperStatusBadge status={paper.status} />
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* 서지 정보 */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          {[
            { label: '저널', value: paper.journal },
            { label: '출판 연도', value: paper.year?.toString() },
            { label: 'DOI', value: paper.doi },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-xs text-zinc-600 mb-0.5">{label}</p>
                <p className="text-sm text-zinc-300">{value}</p>
              </div>
            ) : null,
          )}
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">Abstract</p>
            <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-300">
              {paper.abstract}
            </p>
          </div>
        )}

        {/* 메모 */}
        {paper.notes && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">메모</p>
            <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-400">
              {paper.notes}
            </p>
          </div>
        )}

        {/* 태그 */}
        {paper.tags.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">태그</p>
            <div className="flex flex-wrap gap-1.5">
              {paper.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
            </div>
          </div>
        )}

        {/* 편집/삭제 */}
        <div className="flex gap-3 pt-2">
          <ReferencePaperDialog
            paper={paper}
            projectId={paper.project_id}
            trigger={
              <button className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                편집
              </button>
            }
          />
          <form
            action={async () => {
              'use server'
              await deleteReferencePaper(id)
            }}
          >
            <button
              type="submit"
              className="rounded border border-red-900 px-4 py-2 text-sm text-red-500 hover:border-red-700 hover:text-red-400 transition-colors"
            >
              삭제
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
