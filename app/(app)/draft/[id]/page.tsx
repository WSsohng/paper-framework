import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDraft } from '@/lib/actions/drafts'
import { getTracks } from '@/lib/actions/tracks'
import { getJournals } from '@/lib/actions/journals'
import { getReviews } from '@/lib/actions/reviews'
import { DraftStatusBadge, ReviewSeverityBadge, ReviewCategoryBadge, TagBadge } from '@/components/ui/badge'
import { DraftDialog } from '@/components/module4/draft-dialog'
import { ReviewDialog } from '@/components/module6/review-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraft(id)
  return { title: draft ? `${draft.title} — PaperFactory` : 'Draft Not Found' }
}

export default async function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [draft, tracks, journals, reviews] = await Promise.all([
    getDraft(id), getTracks(), getJournals(), getReviews(id),
  ])
  if (!draft) notFound()

  const openReviews     = reviews.filter((r) => !r.resolved)
  const resolvedReviews = reviews.filter((r) => r.resolved)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {draft.track && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: draft.track.color }} />}
              <h1 className="text-lg font-semibold text-zinc-100">{draft.title}</h1>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              {draft.journal && <span>{draft.journal.name}</span>}
              {draft.word_count != null && <span>· {draft.word_count.toLocaleString()} words</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DraftStatusBadge status={draft.status} />
            <DraftDialog draft={draft} tracks={tracks} journals={journals} trigger={
              <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">수정</button>
            } />
          </div>
        </div>
        {draft.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-6 space-y-8 max-w-3xl">
        {draft.abstract && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">ABSTRACT</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{draft.abstract}</p>
          </section>
        )}

        {draft.notes && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">메모</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{draft.notes}</p>
          </section>
        )}

        {/* Review section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              리뷰 · {reviews.length}개 ({openReviews.length}개 미해결)
            </h2>
            <ReviewDialog
              defaultDraftId={draft.id}
              tracks={tracks}
              trigger={
                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">+ 리뷰 추가</button>
              }
            />
          </div>

          {reviews.length === 0 ? (
            <p className="text-xs text-zinc-700">리뷰 코멘트가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {[...openReviews, ...resolvedReviews].map((review) => (
                <div
                  key={review.id}
                  className={`rounded-lg border px-4 py-3 ${review.resolved ? 'border-zinc-800/50 opacity-50' : 'border-zinc-800'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-zinc-300 leading-snug flex-1">{review.feedback}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <ReviewSeverityBadge severity={review.severity} />
                      <ReviewCategoryBadge category={review.category} />
                    </div>
                  </div>
                  {review.persona && (
                    <p className="mt-1 text-xs text-zinc-600">— {review.persona}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
