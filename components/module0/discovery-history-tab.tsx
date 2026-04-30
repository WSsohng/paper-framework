'use client'

import { useEffect, useState } from 'react'
import {
  getDiscoveryRoundsByTrack,
  type DiscoveryRoundRow,
} from '@/lib/actions/discovery-rounds'
import { getTracks, getTrack } from '@/lib/actions/tracks'
import {
  DOMAIN_LABEL,
  DOMAIN_COLOR,
  MODE_LABEL,
  MODE_COLOR,
} from '@/lib/types/research-questions'
import { DIMENSION_LABEL } from '@/lib/types/novelty-check'
import type { Track } from '@/lib/types'

interface Props {
  projectId: string
}

/** "미분류" 그룹 표현용 sentinel — selectedTrackId === null 과 동일 의미를 UI 에서 구분하기 위함. */
const UNCLASSIFIED = '__unclassified__'

export function DiscoveryHistoryTab({ projectId }: Props) {
  const [tracks, setTracks]               = useState<Track[]>([])
  /** UNCLASSIFIED = 미분류, 또는 track id. 초기 NULL = 아직 미선택. */
  const [selected, setSelected]           = useState<string | null>(null)
  const [trackDetail, setTrackDetail]     = useState<Track | null>(null)
  const [rounds, setRounds]               = useState<DiscoveryRoundRow[]>([])
  const [loadingTracks, setLoadingTracks] = useState(true)
  const [loadingRounds, setLoadingRounds] = useState(false)

  // ── 트랙 목록 로드 ─────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setLoadingTracks(true)
    getTracks(projectId)
      .then((data) => {
        if (!alive) return
        setTracks(data)
        // 기본 선택: 가장 최근 트랙 (없으면 미분류)
        if (data.length > 0) {
          setSelected(data[0].id)
        } else {
          setSelected(UNCLASSIFIED)
        }
      })
      .catch((err) => console.error('[history-tab] getTracks failed:', err))
      .finally(() => alive && setLoadingTracks(false))
    return () => { alive = false }
  }, [projectId])

  // ── 선택 변경 시 라운드 + 트랙 상세 로드 ────────────────
  useEffect(() => {
    if (!selected) return
    let alive = true
    setLoadingRounds(true)

    const trackId = selected === UNCLASSIFIED ? null : selected

    Promise.all([
      getDiscoveryRoundsByTrack(projectId, trackId),
      trackId ? getTrack(trackId) : Promise.resolve(null),
    ])
      .then(([rows, trk]) => {
        if (!alive) return
        setRounds(rows)
        setTrackDetail(trk)
      })
      .catch((err) => console.error('[history-tab] load failed:', err))
      .finally(() => alive && setLoadingRounds(false))

    return () => { alive = false }
  }, [projectId, selected])

  // ── 렌더 ───────────────────────────────────────────────────
  if (loadingTracks) {
    return <div className="py-8 text-sm text-zinc-600">트랙 목록 로딩 중…</div>
  }

  return (
    <div className="space-y-4">
      {/* 트랙 셀렉터 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500">트랙 선택</p>
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected === t.id
                  ? 'border-indigo-500/60 bg-indigo-900/30 text-indigo-200'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
              }`}
              style={selected === t.id ? undefined : { borderLeftColor: t.color, borderLeftWidth: 3 }}
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(UNCLASSIFIED)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === UNCLASSIFIED
                ? 'border-amber-600/60 bg-amber-900/20 text-amber-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600'
            }`}
          >
            미분류
          </button>
        </div>
        {selected === UNCLASSIFIED && (
          <p className="text-[11px] text-zinc-600 leading-snug">
            트랙으로 귀결되지 않았거나 v20 이전에 생성된 라운드입니다.
          </p>
        )}
      </div>

      {/* 트랙 메타 (트랙 선택 시만) */}
      {trackDetail && (
        <TrackMetaCard track={trackDetail} />
      )}

      {/* 라운드 목록 */}
      {loadingRounds ? (
        <div className="py-6 text-sm text-zinc-600">라운드 로딩 중…</div>
      ) : rounds.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-600">
          이 트랙에 발굴 라운드가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-500">
            발굴 라운드 {rounds.length}개 (오래된 순)
          </p>
          {rounds.map((r, i) => (
            <RoundHistoryCard key={r.id} round={r} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 트랙 메타 카드 ─────────────────────────────────────────

function TrackMetaCard({ track }: { track: Track }) {
  const candidates = track.topic_candidates ?? []
  const selectedIdx = track.selected_topic_index
  const novelty = track.novelty_check

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: track.color }} />
        <p className="text-sm font-medium text-zinc-200">{track.name}</p>
        <span className="ml-auto text-[10px] text-zinc-600">
          {new Date(track.created_at).toLocaleDateString('ko-KR')}
        </span>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-zinc-500">추천된 주제 {candidates.length}개</p>
          <div className="space-y-1">
            {candidates.map((c, i) => {
              const isSelected = i === selectedIdx
              return (
                <div
                  key={i}
                  className={`rounded border px-3 py-2 text-xs ${
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-900/20 text-indigo-100'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isSelected ? '선택' : `#${i + 1}`}
                    </span>
                    <span className="text-[10px] text-zinc-600">{c.angle}</span>
                  </div>
                  <p className="leading-snug">{c.title}</p>
                  <p className="mt-1 text-[10px] text-zinc-600 leading-snug">{c.gap}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {novelty && (
        <div className="rounded border border-emerald-700/30 bg-emerald-950/20 px-3 py-2 space-y-1.5">
          <p className="text-[11px] font-medium text-emerald-300">Novelty 검증 결과</p>
          <p className="text-[11px] text-zinc-400 leading-snug">{novelty.summary}</p>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(novelty.dimensions) as [keyof typeof DIMENSION_LABEL, { verdict: string }][]).map(([dim, v]) => (
              <span key={dim} className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                v.verdict === 'novel'   ? 'bg-emerald-900/40 text-emerald-300'
                : v.verdict === 'partial' ? 'bg-amber-900/40 text-amber-300'
                : 'bg-rose-900/40 text-rose-300'
              }`}>
                {DIMENSION_LABEL[dim]}: {v.verdict}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 라운드 카드 ────────────────────────────────────────────

function RoundHistoryCard({ round, index }: { round: DiscoveryRoundRow; index: number }) {
  const candidates = round.question_candidates ?? []
  const hasCandidates = candidates.length > 0

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-zinc-500">Round {index + 1}</span>
        {round.mode && (
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${MODE_COLOR[round.mode]}`}>
            [{MODE_LABEL[round.mode]}]
          </span>
        )}
        {round.angle && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {round.angle}
          </span>
        )}
        <span className="ml-auto text-[10px] text-zinc-600">
          {new Date(round.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* 후보 질문 5개 (있으면) */}
      {hasCandidates ? (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-600">생성된 질문 {candidates.length}개 (선택된 질문 강조)</p>
          {candidates.map((c, i) => {
            const isPicked = c.question === round.question
            return (
              <div
                key={i}
                className={`rounded border px-3 py-2 text-xs leading-snug ${
                  isPicked
                    ? 'border-indigo-500/60 bg-indigo-900/15 text-indigo-100'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  {c.label && (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${MODE_COLOR[c.label]}`}>
                      [{MODE_LABEL[c.label]}]
                    </span>
                  )}
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${DOMAIN_COLOR[c.domain] ?? 'bg-zinc-800 text-zinc-500'}`}>
                    {DOMAIN_LABEL[c.domain] ?? c.domain}
                  </span>
                  {isPicked && (
                    <span className="rounded bg-indigo-700 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      선택됨
                    </span>
                  )}
                </div>
                <p>{c.question}</p>
                {c.focus && <p className="mt-0.5 text-[10px] text-zinc-600 italic">{c.focus}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        // 레거시 라운드 — 후보 없음, 선택된 질문만
        <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 leading-snug">
          {round.question}
          <p className="mt-1 text-[10px] text-zinc-600 italic">v20 이전 라운드 — 후보 5개 정보 없음 (선택된 질문만 보존)</p>
        </div>
      )}

      {/* 인사이트 */}
      {round.user_insight && (
        <div className="rounded border border-amber-800/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200 leading-snug">
          💡 {round.user_insight}
        </div>
      )}

      {/* 저장 논문 요약 */}
      {round.papers && round.papers.length > 0 && (
        <p className="text-[11px] text-zinc-600">
          검색 결과 {round.papers.length}편 / 저장 {round.saved_semantic_ids.length}편
        </p>
      )}
    </div>
  )
}
