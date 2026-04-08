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

        {/* 증명 방법론 */}
        <section className={`rounded-xl border p-5 ${
          hypothesis.methodology
            ? 'border-violet-800/40 bg-violet-950/10'
            : 'border-zinc-800 bg-zinc-900/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              증명 방법론
            </h2>
            {hypothesis.methodology && (
              <span className="text-[10px] text-violet-600">AI 제안 · 수정 가능</span>
            )}
          </div>
          {hypothesis.methodology ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{hypothesis.methodology}</p>
          ) : (
            <p className="text-sm text-zinc-700 italic">
              아직 증명 방법이 없습니다.{' '}
              <HypothesisDialog hypothesis={hypothesis} tracks={tracks} trigger={
                <button className="text-indigo-500 hover:text-indigo-400 not-italic">직접 작성하거나 AI로 생성 →</button>
              } />
            </p>
          )}
        </section>

        {/* 실험 결과 기록 */}
        <section className={`rounded-xl border p-5 ${
          hypothesis.result_notes
            ? 'border-emerald-800/40 bg-emerald-950/10'
            : 'border-zinc-800 border-dashed bg-zinc-900/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              실험 결과 기록
            </h2>
            <span className={`text-[10px] ${
              hypothesis.result_notes ? 'text-emerald-600' : 'text-zinc-700'
            }`}>
              {hypothesis.result_notes ? '기록 완료' : '실험 후 작성'}
            </span>
          </div>
          {hypothesis.result_notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{hypothesis.result_notes}</p>
          ) : (
            <p className="text-sm text-zinc-700 italic">
              실험을 마친 후 결과·수치·관찰 내용을 기록하세요.{' '}
              <HypothesisDialog hypothesis={hypothesis} tracks={tracks} trigger={
                <button className="text-indigo-500 hover:text-indigo-400 not-italic">결과 기록 →</button>
              } />
            </p>
          )}
        </section>

        {!hypothesis.statement && !hypothesis.rationale && !hypothesis.methodology && !hypothesis.result_notes && (
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
