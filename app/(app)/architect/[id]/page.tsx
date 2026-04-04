import { notFound } from 'next/navigation'
import { getHypothesis } from '@/lib/actions/hypotheses'
import { getTracks } from '@/lib/actions/tracks'
import { HypothesisStatusBadge, TagBadge } from '@/components/ui/badge'
import { HypothesisDialog } from '@/components/module3/hypothesis-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const h = await getHypothesis(id)
  return { title: h ? `${h.title} — PaperFactory` : 'Hypothesis Not Found' }
}

export default async function HypothesisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [hypothesis, tracks] = await Promise.all([getHypothesis(id), getTracks()])
  if (!hypothesis) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {hypothesis.track && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hypothesis.track.color }} />}
              <h1 className="text-lg font-semibold text-zinc-100">{hypothesis.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <HypothesisStatusBadge status={hypothesis.status} />
            <HypothesisDialog hypothesis={hypothesis} tracks={tracks} trigger={
              <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">수정</button>
            } />
          </div>
        </div>
        {hypothesis.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hypothesis.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-6 space-y-6 max-w-3xl">
        {hypothesis.statement && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">가설 진술</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{hypothesis.statement}</p>
          </section>
        )}
        {hypothesis.rationale && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">근거 (Rationale)</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{hypothesis.rationale}</p>
          </section>
        )}
        {!hypothesis.statement && !hypothesis.rationale && (
          <div className="py-12 text-center text-sm text-zinc-700">
            가설 진술 또는 근거가 없습니다.
            <HypothesisDialog hypothesis={hypothesis} tracks={tracks} trigger={
              <button className="ml-2 text-indigo-400 hover:text-indigo-300">지금 추가 →</button>
            } />
          </div>
        )}
      </div>
    </div>
  )
}
