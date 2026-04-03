/**
 * ModuleGuideBar — 각 모듈 페이지 상단에 붙는 접이식 가이드.
 *
 * 해당 모듈에서 해야 할 일 전체를 단계별로 보여주고,
 * 시작 조건 / 완료 기준 / 팁도 포함한다.
 * <details> 기반으로 서버 컴포넌트 유지.
 */

import Link from 'next/link'
import { getModuleGuide } from '@/lib/guide-engine'

interface ModuleGuideBarProps {
  moduleTag: string
  /** 현재 활성 스텝 index (0-based). undefined 면 모두 기본 스타일 */
  activeStepIndex?: number
}

const ROLE_STYLE = {
  ai:    { bg: 'bg-indigo-950/60 border-indigo-800/60', text: 'text-indigo-400',  label: 'AI' },
  human: { bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-400', label: '연구자' },
  both:  { bg: 'bg-zinc-800/60 border-zinc-700/60',     text: 'text-zinc-400',    label: 'AI+연구자' },
}

export function ModuleGuideBar({ moduleTag, activeStepIndex }: ModuleGuideBarProps) {
  const guide = getModuleGuide(moduleTag)
  if (!guide) return null

  return (
    <details className="group border-b border-zinc-800 bg-zinc-900/30">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-2.5 select-none hover:bg-zinc-900/60 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-400 text-xs">✦</span>
          <span className="text-xs font-semibold text-zinc-400">
            {guide.tag} 가이드
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500">{guide.name}</span>
          {activeStepIndex !== undefined && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] text-indigo-400">
                현재 Step {activeStepIndex + 1}/{guide.steps.length}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 transition-transform group-open:rotate-180">▼</span>
      </summary>

      <div className="border-t border-zinc-800/60 px-6 py-4 space-y-4">

        {/* 시작 조건 */}
        <div className="flex items-start gap-2.5 rounded-lg bg-zinc-800/30 px-4 py-2.5">
          <span className="shrink-0 text-[10px] font-bold tracking-wider text-amber-500 uppercase mt-0.5">시작 조건</span>
          <p className="text-xs text-zinc-400 leading-relaxed">{guide.trigger}</p>
        </div>

        {/* 단계별 흐름 */}
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">핵심 흐름</p>
          <ol className="space-y-1.5">
            {guide.steps.map((step, i) => {
              const done    = activeStepIndex !== undefined && i < activeStepIndex
              const current = activeStepIndex !== undefined && i === activeStepIndex
              const role    = ROLE_STYLE[step.by]
              return (
                <li key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                  current ? 'bg-indigo-950/40 border border-indigo-800/40' :
                  done    ? 'opacity-50' : ''
                }`}>
                  <span className="shrink-0 flex items-center gap-1.5 mt-0.5">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-mono ${
                      done    ? 'border-zinc-700 bg-zinc-800 text-zinc-500' :
                      current ? `${role.bg} ${role.text}` :
                                'border-zinc-800 text-zinc-600'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${role.bg} ${role.text}`}>
                      {role.label}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <span className={`text-xs font-medium ${current ? 'text-zinc-100' : 'text-zinc-400'}`}>
                      {step.label}
                    </span>
                    {current && (
                      <p className="mt-0.5 text-xs text-zinc-500 leading-snug">{step.desc}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* 완료 기준 */}
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">완료 기준</p>
            <p className="text-xs text-zinc-500 leading-snug">{guide.done_when}</p>
          </div>
          {/* 팁 */}
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-amber-600 uppercase">실전 팁</p>
            <ul className="space-y-1">
              {guide.tips.slice(0, 2).map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 leading-snug">
                  <span className="shrink-0 mt-0.5 text-amber-700">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-700">
            전체 가이드 →{' '}
            <Link href="/insights?tab=guide" className="text-indigo-600 hover:text-indigo-500 underline-offset-2 hover:underline">
              Insights 사용 설명서
            </Link>
          </p>
        </div>
      </div>
    </details>
  )
}
