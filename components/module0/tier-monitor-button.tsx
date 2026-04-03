'use client'

import { useState, useTransition } from 'react'
import { monitorTier1Papers } from '@/lib/actions/search/tier-monitoring'
import type { MonitoringAlert, Tier1PaperForMonitoring } from '@/lib/actions/search/tier-monitoring'

interface Props {
  researchIntent: string
  tier1Papers:    Tier1PaperForMonitoring[]
  existingDois:   string[]
}

const IMPACT_STYLE: Record<MonitoringAlert['impact'], string> = {
  critical:    'border-red-800/50 bg-red-950/30',
  significant: 'border-amber-800/50 bg-amber-950/20',
  minor:       'border-zinc-800 bg-zinc-900/40',
}
const IMPACT_BADGE: Record<MonitoringAlert['impact'], string> = {
  critical:    'bg-red-950 text-red-400 border border-red-800/50',
  significant: 'bg-amber-950 text-amber-400 border border-amber-800/50',
  minor:       'bg-zinc-800 text-zinc-500',
}
const IMPACT_LABEL: Record<MonitoringAlert['impact'], string> = {
  critical:    '긴급',
  significant: '주의',
  minor:       '참고',
}

export function TierMonitorButton({ researchIntent, tier1Papers, existingDois }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    scannedKeywords: string[]
    newPapersFound:  number
    alerts:          MonitoringAlert[]
    scanTime:        string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runScan = () => {
    setError(null)
    startTransition(async () => {
      const res = await monitorTier1Papers(
        researchIntent,
        tier1Papers,
        new Set(existingDois.filter(Boolean)),
        [],  // 키워드 자동 생성
      )
      if (!res.success) {
        setError(res.error)
        return
      }
      setResult({
        scannedKeywords: res.data.scanned_keywords,
        newPapersFound:  res.data.new_papers_found,
        alerts:          res.data.alerts,
        scanTime:        res.data.scan_time,
      })
    })
  }

  const hasAlerts = result && result.alerts.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={runScan}
          disabled={isPending || !researchIntent || tier1Papers.length === 0}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40"
        >
          {isPending ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
              스캔 중…
            </>
          ) : (
            <>
              <span className="text-indigo-500">↺</span>
              1티어 논문 새로고침
            </>
          )}
        </button>
        {tier1Papers.length === 0 && (
          <span className="text-[11px] text-zinc-700">T1 논문이 없으면 스캔할 수 없습니다</span>
        )}
        {result && !isPending && (
          <span className="text-[11px] text-zinc-600">
            {new Date(result.scanTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 스캔 완료 · 신규 {result.newPapersFound}편 발견
            {hasAlerts && (
              <span className="ml-1 font-medium text-amber-400">· 알람 {result.alerts.length}건</span>
            )}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && (
        <>
          {result.alerts.length === 0 ? (
            <p className="text-xs text-zinc-600">
              {result.newPapersFound > 0
                ? `${result.newPapersFound}편 신규 발견됐지만 연구에 직접 영향을 주는 논문은 없습니다.`
                : '연구에 영향을 주는 신규 논문이 없습니다. 현재 방향을 유지하세요.'}
            </p>
          ) : (
            <div className="space-y-2">
              {result.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-4 py-3 ${IMPACT_STYLE[alert.impact]}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${IMPACT_BADGE[alert.impact]}`}>
                      {IMPACT_LABEL[alert.impact]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 leading-snug">
                        {alert.paper_title}
                        {alert.year && <span className="ml-1.5 font-normal text-zinc-500">({alert.year})</span>}
                      </p>
                      {alert.journal && (
                        <p className="mt-0.5 text-[11px] text-zinc-600">{alert.journal}</p>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                        {alert.impact_reason}
                      </p>
                      {alert.doi && (
                        <a
                          href={`https://doi.org/${alert.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-[11px] text-indigo-500 hover:text-indigo-400"
                        >
                          DOI 보기 →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
