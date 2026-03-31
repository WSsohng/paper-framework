import Link from 'next/link'
import { getJournals } from '@/lib/actions/journals'
import { getSelectedProjectId } from '@/lib/selected-project'
import { JournalStatusBadge, TagBadge } from '@/components/ui/badge'
import { JournalDialog } from '@/components/module1/journal-dialog'

export const metadata = { title: 'Journal Intel — Academic Factory' }

const STATUS_ORDER = ['shortlisted', 'considering', 'submitted', 'accepted', 'rejected', 'withdrawn'] as const

const STATUS_LABELS: Record<string, string> = {
  shortlisted: '후보',
  considering: '검토중',
  submitted:   '제출됨',
  accepted:    '게재승인',
  rejected:    '게재거절',
  withdrawn:   '취하됨',
}

export default async function JournalPage() {
  const selectedProjectId = await getSelectedProjectId()
  const journals = await getJournals(selectedProjectId)

  const grouped = STATUS_ORDER.reduce<Record<string, typeof journals>>((acc, s) => {
    acc[s] = journals.filter((j) => j.status === s)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">저널 인텔리전스</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{journals.length}개 저널 추적 중</p>
        </div>
        <JournalDialog
          projectId={selectedProjectId}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 저널 추가
            </button>
          }
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">저널이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">
              {selectedProjectId
                ? '투고를 고려 중인 저널을 추가해보세요.'
                : '사이드바에서 프로젝트를 먼저 선택하세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {STATUS_ORDER.map((status) => {
              const group = grouped[status]
              if (group.length === 0) return null
              return (
                <div key={status}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    {STATUS_LABELS[status]} · {group.length}
                  </p>
                  <div className="space-y-1.5">
                    {group.map((journal) => (
                      <Link
                        key={journal.id}
                        href={`/journal/${journal.id}`}
                        className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
                            {journal.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                            {journal.publisher && <span>{journal.publisher}</span>}
                            {journal.issn && <span>· ISSN {journal.issn}</span>}
                            {journal.impact_factor != null && (
                              <span className="text-amber-600">· IF {journal.impact_factor.toFixed(3)}</span>
                            )}
                          </div>
                          {journal.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {journal.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                            </div>
                          )}
                        </div>
                        <JournalStatusBadge status={journal.status} />
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
