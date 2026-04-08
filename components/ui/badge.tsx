import {
  type PaperStatus,
  type PaperTier,
  type ProjectStatus,
  type TrackStatus,
  type TrackStage,
  type JournalStatus,
  type AssetType,
  type HypothesisStatus,
  type DraftStatus,
  type FigureStatus,
  type FigureType,
  type ReviewSeverity,
  type ReviewCategory,
} from '@/lib/types'
import type { FitLevel } from '@/lib/actions/ai/journal-recommendations'

const projectStatusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  active:    { label: '진행중',   className: 'bg-emerald-950 text-emerald-400' },
  paused:    { label: '일시정지', className: 'bg-amber-950 text-amber-400' },
  completed: { label: '완료',     className: 'bg-blue-950 text-blue-400' },
  archived:  { label: '보관됨',   className: 'bg-zinc-900 text-zinc-600' },
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = projectStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

const paperStatusConfig: Record<PaperStatus, { label: string; className: string }> = {
  unread:   { label: '미읽음',   className: 'bg-zinc-800 text-zinc-400' },
  reading:  { label: '읽는중',   className: 'bg-blue-950 text-blue-400' },
  read:     { label: '읽음',     className: 'bg-zinc-700 text-zinc-300' },
  key:      { label: '핵심',     className: 'bg-indigo-950 text-indigo-300' },
  archived: { label: '보관됨',   className: 'bg-zinc-900 text-zinc-600' },
}

const trackStatusConfig: Record<TrackStatus, { label: string; className: string }> = {
  active:   { label: '활성',     className: 'bg-emerald-950 text-emerald-400' },
  paused:   { label: '일시정지', className: 'bg-amber-950 text-amber-400' },
  archived: { label: '보관됨',   className: 'bg-zinc-900 text-zinc-600' },
}

export function PaperStatusBadge({ status }: { status: PaperStatus }) {
  const cfg = paperStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function TrackStatusBadge({ status }: { status: TrackStatus }) {
  const cfg = trackStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

const journalStatusConfig: Record<JournalStatus, { label: string; className: string }> = {
  considering: { label: '검토중',   className: 'bg-zinc-800 text-zinc-400' },
  shortlisted: { label: '후보',     className: 'bg-indigo-950 text-indigo-300' },
  submitted:   { label: '제출됨',   className: 'bg-blue-950 text-blue-400' },
  accepted:    { label: '게재승인', className: 'bg-emerald-950 text-emerald-400' },
  rejected:    { label: '게재거절', className: 'bg-red-950 text-red-400' },
  withdrawn:   { label: '취하됨',   className: 'bg-zinc-900 text-zinc-600' },
}

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const cfg = journalStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-zinc-800 text-zinc-400">
      {tag}
    </span>
  )
}

// ── M2: Asset ──────────────────────────────────────────────

const assetTypeConfig: Record<AssetType, { label: string; className: string }> = {
  quote:     { label: '인용',      className: 'bg-violet-950 text-violet-400' },
  figure:    { label: '그림',      className: 'bg-blue-950 text-blue-400' },
  table:     { label: '표',        className: 'bg-cyan-950 text-cyan-400' },
  data:      { label: '데이터',    className: 'bg-teal-950 text-teal-400' },
  reference: { label: '참고문헌',  className: 'bg-indigo-950 text-indigo-400' },
  note:      { label: '메모',      className: 'bg-zinc-800 text-zinc-400' },
  idea:      { label: '아이디어',  className: 'bg-purple-950 text-purple-400' },
}

export function AssetTypeBadge({ type }: { type: AssetType }) {
  const cfg = assetTypeConfig[type]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── M3: Hypothesis ─────────────────────────────────────────

const hypothesisStatusConfig: Record<HypothesisStatus, { label: string; className: string }> = {
  draft:     { label: '초안',   className: 'bg-zinc-800 text-zinc-400' },
  active:    { label: '활성',   className: 'bg-emerald-950 text-emerald-400' },
  testing:   { label: '검증중', className: 'bg-amber-950 text-amber-400' },
  confirmed: { label: '확인됨', className: 'bg-indigo-950 text-indigo-300' },
  rejected:  { label: '기각됨', className: 'bg-red-950 text-red-400' },
}

export function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  const cfg = hypothesisStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── M4: Draft ─────────────────────────────────────────────

const draftStatusConfig: Record<DraftStatus, { label: string; className: string }> = {
  outline:   { label: '개요',     className: 'bg-zinc-800 text-zinc-400' },
  drafting:  { label: '초고작성', className: 'bg-blue-950 text-blue-400' },
  revising:  { label: '수정중',   className: 'bg-amber-950 text-amber-400' },
  ready:     { label: '제출준비', className: 'bg-emerald-950 text-emerald-400' },
  submitted: { label: '제출됨',   className: 'bg-indigo-950 text-indigo-300' },
}

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const cfg = draftStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── M5: Figure ────────────────────────────────────────────

const figureStatusConfig: Record<FigureStatus, { label: string; className: string }> = {
  planned: { label: '계획됨', className: 'bg-zinc-800 text-zinc-400' },
  draft:   { label: '초안',   className: 'bg-amber-950 text-amber-400' },
  final:   { label: '최종본', className: 'bg-emerald-950 text-emerald-400' },
}

const figureTypeConfig: Record<FigureType, { label: string }> = {
  chart:   { label: '차트' },
  graph:   { label: '그래프' },
  diagram: { label: '다이어그램' },
  table:   { label: '표' },
  image:   { label: '이미지' },
  other:   { label: '기타' },
}

export function FigureStatusBadge({ status }: { status: FigureStatus }) {
  const cfg = figureStatusConfig[status]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function FigureTypeBadge({ type }: { type: FigureType }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-blue-950 text-blue-400">
      {figureTypeConfig[type].label}
    </span>
  )
}

// ── M6: Review ────────────────────────────────────────────

const reviewSeverityConfig: Record<ReviewSeverity, { label: string; className: string }> = {
  minor:    { label: '경미',   className: 'bg-zinc-800 text-zinc-400' },
  major:    { label: '주요',   className: 'bg-amber-950 text-amber-400' },
  critical: { label: '심각',   className: 'bg-red-950 text-red-400' },
}

const reviewCategoryConfig: Record<ReviewCategory, { label: string }> = {
  methodology: { label: '방법론' },
  clarity:     { label: '명확성' },
  novelty:     { label: '신규성' },
  structure:   { label: '구조' },
  data:        { label: '데이터' },
  other:       { label: '기타' },
}

export function ReviewSeverityBadge({ severity }: { severity: ReviewSeverity }) {
  const cfg = reviewSeverityConfig[severity]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function ReviewCategoryBadge({ category }: { category: ReviewCategory }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-zinc-800 text-zinc-500">
      {reviewCategoryConfig[category].label}
    </span>
  )
}

// ── 참고문헌 티어 ─────────────────────────────────────────

const tierConfig: Record<PaperTier, { label: string; className: string; dot: string; desc: string }> = {
  1: { label: 'T1',  className: 'bg-red-950 text-red-400 border border-red-800/50',       dot: 'bg-red-400',    desc: '고임팩트 (상위 저널·높은 인용·저명 저자)' },
  2: { label: 'T2',  className: 'bg-amber-950 text-amber-400 border border-amber-800/50', dot: 'bg-amber-400',  desc: '중임팩트 (주요 저널·검증된 연구)' },
  3: { label: 'T3',  className: 'bg-zinc-800 text-zinc-400 border border-zinc-700/50',    dot: 'bg-zinc-500',   desc: '낮은 임팩트 (소규모·예비·오래된 연구)' },
}

export function PaperTierBadge({ tier }: { tier: PaperTier | null }) {
  if (!tier) return null
  const cfg = tierConfig[tier]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function PaperTierDot({ tier }: { tier: PaperTier | null }) {
  if (!tier) return <span className="h-2 w-2 rounded-full bg-zinc-700" />
  return <span className={`h-2 w-2 rounded-full ${tierConfig[tier].dot}`} />
}

export const PAPER_TIER_DESC = tierConfig

// ── 저널 Fit Level ────────────────────────────────────────

const fitLevelConfig: Record<FitLevel, { label: string; className: string }> = {
  optimal:      { label: '최적',   className: 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' },
  adequate:     { label: '적절',   className: 'bg-blue-950 text-blue-400 border border-blue-800/50' },
  insufficient: { label: '부족',   className: 'bg-amber-950 text-amber-400 border border-amber-800/50' },
  excessive:    { label: '과잉',   className: 'bg-violet-950 text-violet-400 border border-violet-800/50' },
}

export function FitLevelBadge({ level }: { level: FitLevel }) {
  const cfg = fitLevelConfig[level]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Track Stage ───────────────────────────────────────────

const trackStageConfig: Record<TrackStage, { label: string; by: 'ai' | 'human'; className: string }> = {
  hypothesis:        { label: 'AI 가설 수립',      by: 'ai',    className: 'text-indigo-400' },
  experiment_design: { label: 'AI 실험 설계',      by: 'ai',    className: 'text-indigo-400' },
  experiment:        { label: '실험 진행',          by: 'human', className: 'text-amber-400' },
  validation:        { label: 'AI 실험값 검증',     by: 'ai',    className: 'text-indigo-400' },
  backup_design:     { label: 'AI 백업 실험 설계',  by: 'ai',    className: 'text-indigo-400' },
  backup_experiment: { label: '백업 실험 진행',     by: 'human', className: 'text-amber-400' },
  figures:           { label: 'AI Figure 작성',     by: 'ai',    className: 'text-indigo-400' },
  draft:             { label: 'AI 초고 작성',       by: 'ai',    className: 'text-indigo-400' },
  review:            { label: '레드팀 검수',         by: 'human', className: 'text-zinc-300' },
  submitted:         { label: '제출 완료',           by: 'human', className: 'text-emerald-400' },
}

export function TrackStageBadge({ stage }: { stage: TrackStage | null }) {
  if (!stage) return null
  const cfg = trackStageConfig[stage]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-800/60 px-2 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.by === 'ai' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
      {cfg.label}
    </span>
  )
}

export const TRACK_STAGE_CONFIG = trackStageConfig

// ── Priority Score Badge ─────────────────────────────────
// 우선순위 점수 시각화: 0–100점 → 색상 등급

function priorityColor(score: number): string {
  if (score >= 80) return 'text-rose-400 bg-rose-950/60 ring-rose-700/40'
  if (score >= 60) return 'text-amber-400 bg-amber-950/60 ring-amber-700/40'
  if (score >= 40) return 'text-yellow-400 bg-yellow-950/60 ring-yellow-700/40'
  return 'text-zinc-400 bg-zinc-800/60 ring-zinc-700/40'
}

function priorityLabel(score: number): string {
  if (score >= 80) return '핵심'
  if (score >= 60) return '중요'
  if (score >= 40) return '참고'
  return '보조'
}

export function PriorityScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 text-zinc-600 bg-zinc-900 ring-zinc-800">
        미분석
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold ring-1 tabular-nums ${priorityColor(score)}`}
      title={`우선순위 점수: ${score}점 (${priorityLabel(score)})`}
    >
      {score}
      <span className="text-[9px] font-normal opacity-70">{priorityLabel(score)}</span>
    </span>
  )
}
