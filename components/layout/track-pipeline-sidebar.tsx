'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSelectedTrack } from '@/lib/actions/track-context'
import type { Track, TrackStage } from '@/lib/types'

const STAGE_LABEL: Record<TrackStage, string> = {
  hypothesis:        '가설',
  experiment_design: '설계',
  experiment:        '실험',
  validation:        '검증',
  backup_design:     '백업설계',
  backup_experiment: '백업실험',
  figures:           '도표',
  draft:             '초고',
  review:            '검수',
  submitted:         '제출완료',
}

/** 스테이지 → 색상 */
function stageColor(stage: TrackStage | null) {
  if (!stage) return 'text-zinc-700 bg-zinc-800'
  if (stage === 'submitted') return 'text-emerald-400 bg-emerald-900/50'
  if (stage === 'review') return 'text-amber-400 bg-amber-900/50'
  if (stage === 'draft' || stage === 'figures') return 'text-emerald-400 bg-emerald-900/40'
  if (stage === 'experiment' || stage === 'backup_experiment') return 'text-amber-400 bg-amber-900/40'
  return 'text-indigo-400 bg-indigo-900/40'
}

interface Props {
  tracks: Track[]
  selectedTrackId: string | null
}

export function TrackPipelineSidebar({ tracks, selectedTrackId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function selectTrack(id: string) {
    startTransition(async () => {
      await setSelectedTrack(id === selectedTrackId ? null : id)
      router.refresh()
    })
  }

  const activeTracks = tracks.filter((t) => t.status === 'active')

  if (activeTracks.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-[10px] text-zinc-700 leading-relaxed">
          트랙 없음
          <br />
          <a href="/tracks" className="text-indigo-600 hover:text-indigo-500">+ 트랙 만들기</a>
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-0.5 px-2 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      {activeTracks.map((track) => {
        const isSelected = track.id === selectedTrackId
        return (
          <button
            key={track.id}
            onClick={() => selectTrack(track.id)}
            disabled={isPending}
            className={`group w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all duration-100 ${
              isSelected
                ? 'bg-zinc-800 ring-1 ring-inset ring-zinc-700'
                : 'hover:bg-zinc-800/60'
            }`}
          >
            {/* 트랙 색상 도트 */}
            <span
              className="shrink-0 h-2 w-2 rounded-full"
              style={{ backgroundColor: track.color }}
            />

            {/* 트랙 이름 */}
            <span
              className={`flex-1 truncate text-[11px] leading-tight font-medium ${
                isSelected ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-300'
              }`}
            >
              {track.name}
            </span>

            {/* 단계 뱃지 */}
            {track.current_stage && (
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none ${stageColor(track.current_stage)}`}
              >
                {STAGE_LABEL[track.current_stage]}
              </span>
            )}

            {/* 선택 표시 */}
            {isSelected && (
              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
