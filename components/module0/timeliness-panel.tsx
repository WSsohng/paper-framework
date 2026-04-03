'use client'

import { useState, useTransition } from 'react'
import { analyzeTimeliness } from '@/lib/actions/ai/timeliness'
import { updateTrack } from '@/lib/actions/tracks'
import type { Tier1PaperSummary } from '@/lib/actions/ai/timeliness'
import type { TrackStage } from '@/lib/types'

interface Props {
  trackId:             string
  projectName:         string
  researchIntent:      string
  tier1Papers:         Tier1PaperSummary[]
  experimentStartDate: string | null
  targetSubmitDate:    string | null
  currentStage:        TrackStage | null
}

const STAGE_OPTIONS: { value: TrackStage; label: string; by: 'ai' | 'human' }[] = [
  { value: 'hypothesis',        label: 'AI 가설 수립',       by: 'ai'    },
  { value: 'experiment_design', label: 'AI 실험 설계',       by: 'ai'    },
  { value: 'experiment',        label: '실험 진행 중',        by: 'human' },
  { value: 'validation',        label: 'AI 실험값 검증',     by: 'ai'    },
  { value: 'backup_design',     label: 'AI 백업 실험 설계',  by: 'ai'    },
  { value: 'backup_experiment', label: '백업 실험 중',       by: 'human' },
  { value: 'figures',           label: 'AI Figure 작성',    by: 'ai'    },
  { value: 'draft',             label: 'AI 초고 작성',      by: 'ai'    },
  { value: 'review',            label: '레드팀 검수',        by: 'human' },
  { value: 'submitted',         label: '제출 완료',          by: 'human' },
]

const URGENCY_COLOR = {
  critical: 'text-red-400 bg-red-950/40 border-red-800/50',
  high:     'text-amber-400 bg-amber-950/40 border-amber-800/50',
  moderate: 'text-yellow-400 bg-yellow-950/30 border-yellow-800/40',
  low:      'text-zinc-400 bg-zinc-800/40 border-zinc-700/30',
}
const URGENCY_LABEL = {
  critical: '긴급',
  high:     '주의',
  moderate: '보통',
  low:      '여유',
}

export function TimelinessPanel({
  trackId,
  projectName,
  researchIntent,
  tier1Papers,
  experimentStartDate: initExpDate,
  targetSubmitDate: initTargetDate,
  currentStage: initStage,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const [expDate,     setExpDate]     = useState(initExpDate ?? '')
  const [targetDate,  setTargetDate]  = useState(initTargetDate ?? '')
  const [stage,       setStage]       = useState<TrackStage | null>(initStage)
  const [analysis,    setAnalysis]    = useState<Awaited<ReturnType<typeof analyzeTimeliness>> | null>(null)
  const [savingDates, setSavingDates] = useState(false)

  const runAnalysis = () => {
    startTransition(async () => {
      const result = await analyzeTimeliness(
        projectName,
        researchIntent,
        tier1Papers,
        expDate || null,
      )
      setAnalysis(result)
      // If AI recommends a date and user hasn't set one, pre-fill
      if (result.success && !targetDate) {
        setTargetDate(result.data.recommended_submit_date)
        await updateTrack(trackId, { target_submit_date: result.data.recommended_submit_date })
      }
    })
  }

  const saveDates = async () => {
    setSavingDates(true)
    await updateTrack(trackId, {
      experiment_start_date: expDate || null,
      target_submit_date:    targetDate || null,
    })
    setSavingDates(false)
  }

  const saveStage = (s: TrackStage) => {
    setStage(s)
    startTransition(async () => {
      await updateTrack(trackId, { current_stage: s })
    })
  }

  return (
    <div className="space-y-5">
      {/* ── 현재 단계 ──────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">현재 논문 작성 단계</p>
        <div className="flex flex-wrap gap-1.5">
          {STAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => saveStage(opt.value)}
              disabled={isPending}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                stage === opt.value
                  ? opt.by === 'ai'
                    ? 'border-indigo-600 bg-indigo-900/50 text-indigo-300'
                    : 'border-amber-600 bg-amber-900/40 text-amber-300'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              }`}
            >
              <span className={`mr-1 text-[9px] ${opt.by === 'ai' ? 'text-indigo-600' : 'text-amber-600'}`}>
                {opt.by === 'ai' ? '●' : '◆'}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-700">
          <span className="text-indigo-600">●</span> AI 담당  
          <span className="ml-2 text-amber-600">◆</span> 인간 담당
        </p>
      </div>

      {/* ── 실험 일정 ──────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">실험 일정</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1">실험 시작 예정일</label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1">투고 목표일</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={saveDates}
            disabled={savingDates}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            {savingDates ? '저장 중…' : '일정 저장'}
          </button>
          <button
            onClick={runAnalysis}
            disabled={isPending || !researchIntent}
            className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 transition-colors disabled:opacity-40"
          >
            {isPending ? '분석 중…' : '✦ AI 시의성 분석'}
          </button>
        </div>
        {!researchIntent && (
          <p className="mt-1 text-[10px] text-amber-600">
            프로젝트 Research Intent를 먼저 입력해야 분석이 가능합니다.
          </p>
        )}
      </div>

      {/* ── 분석 결과 ──────────────────────────── */}
      {analysis && (
        analysis.success ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            {/* 긴급도 */}
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${URGENCY_COLOR[analysis.data.urgency]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {URGENCY_LABEL[analysis.data.urgency]} 긴급도
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1">논문 사이클 분석</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                이 분야 논문 주기: <span className="text-zinc-300 font-medium">약 {analysis.data.field_cycle_months}개월</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{analysis.data.urgency_reason}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1">권장 투고 시점: {analysis.data.recommended_submit_date}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{analysis.data.reasoning}</p>
            </div>

            {analysis.data.risk_factors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-400 mb-1">주의 사항</p>
                <ul className="space-y-0.5">
                  {analysis.data.risk_factors.map((r, i) => (
                    <li key={i} className="text-xs text-zinc-500 flex gap-1.5">
                      <span className="text-amber-600 shrink-0">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-red-400">{analysis.error}</p>
        )
      )}
    </div>
  )
}
