import {
  type PaperStatus,
  type ProjectStatus,
  type TrackStatus,
  type JournalStatus,
  type AssetType,
  type HypothesisStatus,
  type DraftStatus,
  type FigureStatus,
  type FigureType,
  type ReviewSeverity,
  type ReviewCategory,
} from '@/lib/types'

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
