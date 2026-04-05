'use client'

import { useTransition, useState } from 'react'
import { monitorTrackPapers } from '@/lib/actions/search/track-monitoring'
import { RelevanceBadge } from '@/components/module0/relevance-badge'
import type { TrackMonitorAlert } from '@/lib/actions/search/track-monitoring'

interface Props {
  trackId:             string
  trackName:           string
  trackResearchIntent: string
  projectId?:          string
  existingDois:        string[]
}

export function TrackMonitorButton({
  trackId, trackName, trackResearchIntent, projectId, existingDois,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [alerts, setAlerts] = useState<TrackMonitorAlert[] | null>(null)
  const [scannedCount, setScannedCount] = useState<number>(0)
  const [lastScan, setLastScan] = useState<string | null>(null)

  if (!trackResearchIntent?.trim()) return null

  function handleMonitor() {
    startTransition(async () => {
      const doisSet = new Set(existingDois.filter(Boolean))
      const result = await monitorTrackPapers(trackResearchIntent, doisSet, projectId)
      if (result.success) {
        setAlerts(result.data.alerts)
        setScannedCount(result.data.new_papers_found)
        setLastScan(new Date(result.data.scan_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* 버튼 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMonitor}
          disabled={isPending}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-violet-50 text-violet-700 border border-violet-200
            hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300
            dark:border-violet-800 dark:hover:bg-violet-900/40
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
        >
          {isPending ? (
            <><span className="animate-spin inline-block">⟳</span> 스캔 중…</>
          ) : (
            <><span>⟳</span> 새로고침 — {trackName} 연관 논문 모니터링</>
          )}
        </button>
        {lastScan && (
          <span className="text-[10px] text-zinc-400">
            최근 스캔: {lastScan} · {scannedCount}편 신규 발견
          </span>
        )}
      </div>

      {/* 결과 알림 */}
      {alerts !== null && (
        <div className="space-y-1.5">
          {alerts.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              R1/R2 신규 논문 없음 — 현재 컬렉션이 최신 상태입니다.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                {alerts.filter(a => a.relevance_level === 1).length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 mr-2">
                    ⚡ R1 핵심 논문 발견!
                  </span>
                )}
                {alerts.filter(a => a.contradicts).length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 mr-2">
                    ⚠ 반박 가능 논문 {alerts.filter(a => a.contradicts).length}편
                  </span>
                )}
                총 {alerts.length}편 신규 관련 논문
              </p>
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`
                    rounded-lg border px-3 py-2 text-xs space-y-1
                    ${alert.relevance_level === 1
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20'
                      : alert.contradicts
                      ? 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20'
                      : 'border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/30'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <RelevanceBadge level={alert.relevance_level} />
                    {alert.contradicts && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
                        반박 가능
                      </span>
                    )}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 flex-1">
                      {alert.paper_title}
                    </span>
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400 flex gap-2 flex-wrap">
                    {alert.journal && <span>{alert.journal}</span>}
                    {alert.year    && <span>{alert.year}</span>}
                    {alert.doi && (
                      <a
                        href={`https://doi.org/${alert.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-zinc-700"
                      >
                        DOI
                      </a>
                    )}
                    {alert.open_access_url && (
                      <a
                        href={alert.open_access_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-zinc-700"
                      >
                        OA 링크
                      </a>
                    )}
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300">{alert.relevance_reason}</p>
                  {alert.contradiction_note && (
                    <p className="text-amber-700 dark:text-amber-300">
                      ⚠ {alert.contradiction_note}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
