/**
 * GuideCard — 대시보드용 AI 가이드 카드.
 *
 * 현재 단계에서 해야 할 구체적인 액션 하나를 강조하고,
 * 직접 이동 버튼으로 네비게이션 역할을 한다.
 *
 * 렌더링 데이터는 부모(dashboard)에서 computeGuideState()로 계산해서 props로 전달.
 */

import Link from 'next/link'
import type { GuideState } from '@/lib/guide-engine'

interface GuideCardProps {
  state: GuideState
  researchIntent?: string | null
}

const ROLE_STYLE = {
  ai:    { bg: 'bg-indigo-950/60 border-indigo-800/60', text: 'text-indigo-400', label: 'AI' },
  human: { bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-400', label: '연구자' },
  both:  { bg: 'bg-zinc-800/60 border-zinc-700/60',    text: 'text-zinc-400',    label: 'AI + 연구자' },
}

export function GuideCard({ state, researchIntent }: GuideCardProps) {
  const { guide, step, stepIndex } = state
  const role = ROLE_STYLE[step.by]
  const totalSteps = guide.steps.length

  return (
    <div className="rounded-xl border border-indigo-800/40 bg-gradient-to-br from-indigo-950/30 to-zinc-900/60 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-indigo-800/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-400 text-sm">✦</span>
          <span className="text-xs font-semibold text-indigo-300">AI 가이드</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono text-xs font-bold text-indigo-400">{guide.tag}</span>
          <span className="text-sm text-zinc-300 font-medium">{guide.name}</span>
        </div>
        <span className="text-[10px] text-zinc-600">
          Step {stepIndex + 1} / {totalSteps}
        </span>
      </div>

      {/* 현재 스텝 */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* 역할 배지 + 스텝 번호 */}
          <div className="shrink-0 flex flex-col items-center gap-1.5 mt-0.5">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${role.bg} ${role.text}`}>
              {stepIndex + 1}
            </span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${role.bg} ${role.text}`}>
              {role.label}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100">{step.label}</p>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
          </div>

          <Link
            href={guide.href}
            className="shrink-0 self-start rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            이동하기 →
          </Link>
        </div>

        {/* 완료 기준 */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3.5 py-2.5">
          <span className="shrink-0 mt-0.5 text-[10px] font-bold tracking-wider text-emerald-600 uppercase">완료 기준</span>
          <p className="text-xs text-zinc-500 leading-snug">{guide.done_when}</p>
        </div>

        {/* 모든 스텝 미니 타임라인 */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5">
          {guide.steps.map((s, i) => {
            const done = i < stepIndex
            const current = i === stepIndex
            const roleStyle = ROLE_STYLE[s.by]
            return (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <div
                  title={`${i + 1}. ${s.label}`}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-medium transition-colors ${
                    done
                      ? 'border-zinc-700 bg-zinc-800/40 text-zinc-600'
                      : current
                      ? `${roleStyle.bg} ${roleStyle.text} font-bold`
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-700'
                  }`}
                >
                  {done ? '✓' : <span>{i + 1}</span>}
                  <span className="hidden sm:inline max-w-[6rem] truncate">{s.label}</span>
                </div>
                {i < guide.steps.length - 1 && (
                  <span className="text-zinc-800 text-[10px]">›</span>
                )}
              </div>
            )
          })}
        </div>

        {/* 실전 팁 (첫 번째만) */}
        {guide.tips.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-zinc-600 leading-snug">
            <span className="shrink-0 mt-0.5 text-amber-700">·</span>
            {guide.tips[0]}
          </p>
        )}
      </div>
    </div>
  )
}
