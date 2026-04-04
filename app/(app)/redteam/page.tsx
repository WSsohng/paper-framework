import Link from 'next/link'
import { getReviews } from '@/lib/actions/reviews'
import { getDrafts } from '@/lib/actions/drafts'
import { getTracks } from '@/lib/actions/tracks'
import { ReviewSeverityBadge, ReviewCategoryBadge, TagBadge } from '@/components/ui/badge'
import { ReviewDialog } from '@/components/module6/review-dialog'

export const metadata = { title: 'Red Team — PaperFactory' }

export default async function RedTeamPage() {
  const { getSelectedProjectId } = await import('@/lib/selected-project')
  const selectedProjectId = await getSelectedProjectId()
  const [reviews, drafts, tracks] = await Promise.all([
    getReviews(),
    getDrafts({ projectId: selectedProjectId ?? undefined }),
    getTracks(selectedProjectId),
  ])

  const openReviews     = reviews.filter((r) => !r.resolved)
  const resolvedReviews = reviews.filter((r) => r.resolved)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">레드팀 & 제출</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {openReviews.length}개 미해결 · {resolvedReviews.length}개 해결됨
          </p>
        </div>
        <ReviewDialog
          drafts={drafts}
          tracks={tracks}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 리뷰 추가
            </button>
          }
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">리뷰 코멘트가 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">가상 리뷰어의 비판을 추가해 논문을 강화하세요.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {openReviews.length > 0 && (
              <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  미해결 · {openReviews.length}
                </p>
                <div className="space-y-2">
                  {openReviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex-1 text-sm text-zinc-300 leading-snug">{review.feedback}</p>
                        <div className="flex shrink-0 gap-1.5">
                          <ReviewSeverityBadge severity={review.severity} />
                          <ReviewCategoryBadge category={review.category} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                        {review.persona && <span>— {review.persona}</span>}
                        {review.draft && <Link href={`/draft/${review.draft.id}`} className="hover:text-zinc-400">{review.draft.title}</Link>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolvedReviews.length > 0 && (
              <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  해결됨 · {resolvedReviews.length}
                </p>
                <div className="space-y-1.5 opacity-50">
                  {resolvedReviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex-1 text-sm text-zinc-500 leading-snug line-through">{review.feedback}</p>
                        <div className="flex shrink-0 gap-1.5">
                          <ReviewSeverityBadge severity={review.severity} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
