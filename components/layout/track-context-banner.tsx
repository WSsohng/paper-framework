import type { Track, TrackStage } from '@/lib/types'

const STAGE_LABEL: Record<TrackStage, string> = {
  hypothesis:        '가설 수립',
  experiment_design: '실험 설계',
  experiment:        '실험 진행',
  validation:        '검증 중',
  backup_design:     '백업 설계',
  backup_experiment: '백업 실험',
  figures:           '도표 작성',
  draft:             '초고 작성',
  review:            '검수 중',
  submitted:         '제출 완료',
}

function stageBadgeClass(stage: TrackStage) {
  if (stage === 'submitted') return 'bg-emerald-900/50 text-emerald-400'
  if (stage === 'review') return 'bg-amber-900/50 text-amber-400'
  if (stage === 'draft' || stage === 'figures') return 'bg-emerald-900/40 text-emerald-500'
  if (stage === 'experiment' || stage === 'backup_experiment') return 'bg-amber-900/40 text-amber-500'
  return 'bg-indigo-900/40 text-indigo-400'
}

interface Props {
  selectedTrack: Pick<Track, 'id' | 'name' | 'color' | 'current_stage'> | null
  totalCount?: number
  label?: string
}

export function TrackContextBanner({ selectedTrack, totalCount, label }: Props) {
  if (!selectedTrack) {
    return (
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/30 px-8 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
        <p className="text-[11px] text-zinc-600">
          전체 보기 중 · 사이드바에서 트랙을 선택하면 해당 트랙의 데이터만 표시됩니다
        </p>
        {totalCount !== undefined && (
          <span className="ml-auto text-[11px] text-zinc-700">
            {label ?? '항목'} {totalCount}개
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/40 px-8 py-2">
      {/* 트랙 색상 도트 */}
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: selectedTrack.color }}
      />

      {/* 트랙 이름 */}
      <span className="text-[12px] font-semibold text-zinc-300">
        {selectedTrack.name}
      </span>

      {/* 단계 뱃지 */}
      {selectedTrack.current_stage && (
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${stageBadgeClass(selectedTrack.current_stage)}`}
        >
          {STAGE_LABEL[selectedTrack.current_stage]}
        </span>
      )}

      <span className="text-[10px] text-zinc-700">· 이 트랙의 데이터만 표시</span>

      {totalCount !== undefined && (
        <span className="ml-auto text-[11px] text-zinc-600">
          {label ?? '항목'} {totalCount}개
        </span>
      )}
    </div>
  )
}
