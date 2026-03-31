import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getJournal } from '@/lib/actions/journals'
import { getSelectedProjectId } from '@/lib/selected-project'
import { JournalStatusBadge, TagBadge } from '@/components/ui/badge'
import { JournalDialog } from '@/components/module1/journal-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const journal = await getJournal(id)
  return { title: journal ? `${journal.name} — Academic Factory` : 'Journal Not Found' }
}

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [journal, selectedProjectId] = await Promise.all([getJournal(id), getSelectedProjectId()])

  if (!journal) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-zinc-100 leading-snug">{journal.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              {journal.publisher && <span>{journal.publisher}</span>}
              {journal.issn && <span>· ISSN {journal.issn}</span>}
              {journal.impact_factor != null && (
                <span className="font-medium text-amber-500">
                  · IF {journal.impact_factor.toFixed(3)}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <JournalStatusBadge status={journal.status} />
            <JournalDialog
              journal={journal}
              projectId={selectedProjectId}
              trigger={
                <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  수정
                </button>
              }
            />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
          <Link href="/journal" className="hover:text-zinc-400">저널 목록</Link>
        </div>

        {journal.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {journal.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-6 space-y-6 max-w-3xl">
        {(journal.website || journal.submission_url) && (
          <div className="flex gap-3">
            {journal.website && (
              <a
                href={journal.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                저널 웹사이트 ↗
              </a>
            )}
            {journal.submission_url && (
              <a
                href={journal.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-indigo-800 bg-indigo-950 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                투고하기 ↗
              </a>
            )}
          </div>
        )}

        {journal.scope && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">게재 범위 (Scope)</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{journal.scope}</p>
          </section>
        )}

        {journal.notes && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">메모</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{journal.notes}</p>
          </section>
        )}

        {!journal.scope && !journal.notes && (
          <div className="py-12 text-center text-sm text-zinc-700">
            Scope 또는 메모가 없습니다.
            <JournalDialog
              journal={journal}
              projectId={selectedProjectId}
              trigger={
                <button className="ml-2 text-indigo-400 hover:text-indigo-300">지금 추가 →</button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
