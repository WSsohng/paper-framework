import Link from 'next/link'
import { getReferencePapers } from '@/lib/actions/reference-papers'
import { getProject } from '@/lib/actions/projects'
import { getSelectedProjectId } from '@/lib/selected-project'
import { PaperStatusBadge, TagBadge } from '@/components/ui/badge'
import { ReferencePaperDialog } from '@/components/module0/reference-paper-dialog'
import { LiteratureDiscoveryPanel } from '@/components/module0/literature-discovery-panel'

export const metadata = { title: 'Reference Papers — Academic Factory' }

export default async function ReferencePapersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const isDiscover = view === 'discover'

  const selectedProjectId = await getSelectedProjectId()

  if (!selectedProjectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-zinc-500">사이드바에서 프로젝트를 먼저 선택하세요.</p>
      </div>
    )
  }

  const [papers, project] = await Promise.all([
    getReferencePapers(selectedProjectId),
    getProject(selectedProjectId),
  ])

  const keyPapers    = papers.filter((p) => p.status === 'key')
  const activePapers = papers.filter((p) => p.status !== 'archived')

  // DOI set for deduplication in discovery panel
  const existingDois = new Set(papers.map((p) => p.doi).filter(Boolean) as string[])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">공유 참고문헌</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {papers.length}편 · {keyPapers.length}편 핵심 · 프로젝트 공유
          </p>
        </div>
        <ReferencePaperDialog
          projectId={selectedProjectId}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 논문 추가
            </button>
          }
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-0 border-b border-zinc-800 px-8">
        <Link
          href="/reference-papers"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            !isDiscover
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          목록
        </Link>
        <Link
          href="/reference-papers?view=discover"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            isDiscover
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ✦ AI 문헌 탐색
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {isDiscover ? (
          <LiteratureDiscoveryPanel
            projectId={selectedProjectId}
            projectName={project?.name ?? ''}
            researchIntent={project?.research_intent ?? null}
            existingDois={existingDois}
          />
        ) : (
          <>
            {activePapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-sm text-zinc-500">참고문헌이 없습니다.</p>
                <p className="mt-1 text-xs text-zinc-700">
                  논문을 직접 추가하거나{' '}
                  <Link
                    href="/reference-papers?view=discover"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    AI 문헌 탐색
                  </Link>
                  을 이용하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activePapers.map((paper) => (
                  <Link
                    key={paper.id}
                    href={`/reference-papers/${paper.id}`}
                    className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        paper.status === 'key'
                          ? 'bg-indigo-400'
                          : paper.status === 'reading'
                          ? 'bg-blue-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
                        {paper.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                        {paper.authors.length > 0 && (
                          <span>
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 ? ' 외' : ''}
                          </span>
                        )}
                        {paper.journal && <span>· {paper.journal}</span>}
                        {paper.year    && <span>· {paper.year}</span>}
                        {paper.doi     && <span>· DOI: {paper.doi}</span>}
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
          </>
        )}
      </div>
    </div>
  )
}
