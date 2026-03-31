import Link from 'next/link'
import { getJournals } from '@/lib/actions/journals'
import { getProject } from '@/lib/actions/projects'
import { getSelectedProjectId } from '@/lib/selected-project'
import { JournalStatusBadge, TagBadge } from '@/components/ui/badge'
import { JournalDialog } from '@/components/module1/journal-dialog'
import { JournalAiPanel } from '@/components/module1/journal-ai-panel'

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
  const [journals, project] = await Promise.all([
    getJournals(selectedProjectId),
    selectedProjectId ? getProject(selectedProjectId) : Promise.resolve(null),
  ])

  const grouped = STATUS_ORDER.reduce<Record<string, typeof journals>>((acc, s) => {
    acc[s] = journals.filter((j) => j.status === s)
    return acc
  }, {})

  const existingNames = journals.map((j) => j.name)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">저널 인텔리전스</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{journals.length}개 저널 추적 중</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI 추천 버튼 — project와 research_intent가 있을 때만 표시 */}
          {project && (
            <JournalAiPanel
              projectName={project.name}
              researchIntent={project.research_intent}
              projectId={selectedProjectId}
              existingNames={existingNames}
            />
          )}
          <JournalDialog
            projectId={selectedProjectId}
            trigger={
              <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                + 직접 추가
              </button>
            }
          />
        </div>
      </div>

      {/* Research Intent 힌트 (없을 때) */}
      {project && !project.research_intent && (
        <div className="mx-8 mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3">
          <p className="text-xs text-amber-600">
            💡 프로젝트에 <strong>Research Intent</strong>를 추가하면 AI가 더 정확한 저널을 추천해 드립니다.
          </p>
        </div>
      )}

      {/* 저널 목록 */}
      <div className="flex-1 px-8 py-6">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <p className="text-sm text-zinc-500">아직 저널이 없습니다.</p>
            {project?.research_intent ? (
              <p className="text-xs text-zinc-700">
                상단의 <span className="text-indigo-400">✦ AI 저널 추천</span>을 클릭해 Research Intent 기반으로 자동 추천받아 보세요.
              </p>
            ) : (
              <p className="text-xs text-zinc-700">
                {selectedProjectId
                  ? '직접 추가하거나 프로젝트에 Research Intent를 설정하면 AI 추천을 받을 수 있습니다.'
                  : '사이드바에서 프로젝트를 먼저 선택하세요.'}
              </p>
            )}
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
                              <span className="text-amber-500 font-medium">
                                · IF {journal.impact_factor.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {/* AI 인사이트 (notes에 저장됨) */}
                          {journal.notes && (
                            <p className="mt-1 text-xs text-zinc-600 leading-relaxed line-clamp-1">
                              {journal.notes}
                            </p>
                          )}
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
