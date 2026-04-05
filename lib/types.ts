// ============================================================
// PaperFactory — shared domain types
// ============================================================

// ── Project (최상위) ──────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  description: string | null
  research_intent: string | null
  status: ProjectStatus
  tags: string[]
  created_at: string
  updated_at: string
  // aggregated
  track_count?: number
}

export interface ProjectInput {
  name: string
  description?: string
  research_intent?: string
  status?: ProjectStatus
  tags?: string[]
}

// ── Module 0: Track ────────────────────────────────────────

export type TrackStatus    = 'active' | 'paused' | 'archived'
export type TrackRelation  = 'parallel' | 'sequential'

/** 논문 작성 Flow 단계 — AI/인간 역할 구분 */
export type TrackStage =
  | 'hypothesis'        // AI: 가설 수립
  | 'experiment_design' // AI: 코어 실험 설계
  | 'experiment'        // 인간: 실험 진행
  | 'validation'        // AI: 실험값 검증·재설계
  | 'backup_design'     // AI: 백업 실험 설계
  | 'backup_experiment' // 인간: 백업 실험
  | 'figures'           // AI: Figure·Table 작성
  | 'draft'             // AI: 논문 초고 작성
  | 'review'            // AI+인간: 레드팀·검수
  | 'submitted'         // 제출 완료

export interface TrackContextEntry {
  timestamp: string
  stage:     TrackStage | null
  note:      string   // 결정 내용 or 인사이트
  by:        'ai' | 'human'
}

export interface Track {
  id: string
  project_id: string | null
  parent_track_id: string | null
  relation_type: TrackRelation
  name: string
  description: string | null
  research_intent: string | null
  color: string
  status: TrackStatus
  current_stage: TrackStage | null
  experiment_start_date: string | null
  target_submit_date: string | null
  context_log: TrackContextEntry[]
  tags: string[]
  created_at: string
  updated_at: string
  // joined
  project?: Pick<Project, 'id' | 'name'>
  parent_track?: Pick<Track, 'id' | 'name'>
  paper_count?: number
}

export interface TrackInput {
  project_id?: string | null
  parent_track_id?: string | null
  relation_type?: TrackRelation
  name: string
  description?: string
  research_intent?: string
  color?: string
  status?: TrackStatus
  current_stage?: TrackStage | null
  experiment_start_date?: string | null
  target_submit_date?: string | null
  context_log?: TrackContextEntry[]
  tags?: string[]
}

// ── Module 0: Paper (트랙별 분석 논문) ────────────────────

export type PaperStatus = 'unread' | 'reading' | 'read' | 'key' | 'archived'

export interface Paper {
  id: string
  track_id: string | null
  title: string
  authors: string[]
  journal: string | null
  year: number | null
  doi: string | null
  abstract: string | null
  notes: string | null
  status: PaperStatus
  tags: string[]
  created_at: string
  updated_at: string
  // joined
  track?: Pick<Track, 'id' | 'name' | 'color'>
}

export interface PaperInput {
  track_id?: string
  title: string
  authors?: string[]
  journal?: string
  year?: number
  doi?: string
  abstract?: string
  notes?: string
  status?: PaperStatus
  tags?: string[]
}

// ── Module 0: Reference Paper (프로젝트 공유 참고문헌) ────

/**
 * 참고문헌 티어:
 * 1 = 매우 밀접 (accept에 직접 영향 가능)
 * 2 = 핵심 근거 (추론 레퍼런스)
 * 3 = 거시적 흐름 (서론·배경)
 */
export type PaperTier = 1 | 2 | 3

export interface ReferencePaper {
  id: string
  project_id: string
  title: string
  authors: string[]
  journal: string | null
  year: number | null
  doi: string | null
  abstract: string | null
  notes: string | null
  status: PaperStatus
  tier: PaperTier | null
  tags: string[]
  /** AI 추출 핵심 개념 키워드 */
  concepts: string[]
  /** 프로젝트 Research Intent 대비 관련도 (AI, 0–1) */
  relevance_score: number | null
  /** 우선순위 점수: tier(45%) + 최신성(15%) + 관련도(40%), 0–100 */
  priority_score: number | null
  created_at: string
  updated_at: string
  // joined
  project?: Pick<Project, 'id' | 'name'>
}

export interface ReferencePaperInput {
  project_id: string
  title: string
  authors?: string[]
  journal?: string
  year?: number
  doi?: string
  abstract?: string
  notes?: string
  status?: PaperStatus
  tier?: PaperTier | null
  tags?: string[]
}

// ── Module 0: Track-Paper Relevance (junction) ───────────

/**
 * 트랙별 논문 연관도:
 * 1 (R1) = 핵심 연관 — 트랙이 직접 다루는 방법론·결과·주제
 * 2 (R2) = 부분 연관 — 방법론·개념 공유, 보강 근거로 활용
 * 3 (R3) = 배경 연관 — 분야 맥락, 서론·배경 참조용
 *
 * ※ Tier(T1-T3)와 독립적: 같은 논문이 트랙A에서는 R1, 트랙B에서는 R3일 수 있음
 */
export type RelevanceLevel = 1 | 2 | 3

export interface TrackRelevance {
  reference_paper_id: string
  track_id: string
  relevance_level: RelevanceLevel
  relevance_reason: string | null
  tagged_by: 'ai' | 'user'
  created_at: string
  updated_at: string
}

export interface TrackRelevanceInput {
  reference_paper_id: string
  track_id: string
  relevance_level: RelevanceLevel
  relevance_reason?: string
  tagged_by?: 'ai' | 'user'
}

// ── Module 1: Journal Intel (프로젝트 공유) ───────────────

export type JournalStatus =
  | 'considering'
  | 'shortlisted'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type FitLevel = 'optimal' | 'adequate' | 'insufficient' | 'excessive'

/**
 * 저널 × 트랙 조합의 AI Fit 분석 결과.
 * journals.track_analyses JSONB 배열의 원소.
 */
export interface TrackFitAnalysis {
  track_id:    string
  track_name:  string
  track_color: string   // hex color
  fit_level:   FitLevel
  fit_reason:  string   // Korean, 2-3 sentences
  analyzed_at: string   // ISO datetime
}

export interface Journal {
  id: string
  project_id: string | null
  name: string
  publisher: string | null
  issn: string | null
  impact_factor: number | null
  scope: string | null
  website: string | null
  submission_url: string | null
  status: JournalStatus
  notes: string | null
  tags: string[]
  track_analyses: TrackFitAnalysis[]
  created_at: string
  updated_at: string
  // joined
  project?: Pick<Project, 'id' | 'name'>
}

export interface JournalInput {
  project_id?: string | null
  name: string
  publisher?: string
  issn?: string
  impact_factor?: number
  scope?: string
  website?: string
  submission_url?: string
  status?: JournalStatus
  notes?: string
  tags?: string[]
}

// ── Module 2: Asset Library (프로젝트 공유) ───────────────

export type AssetType = 'quote' | 'figure' | 'table' | 'data' | 'reference' | 'note'

/**
 * 논문 섹션 — AI 초고 생성 시 컨텍스트로 활용
 */
export type AssetSection =
  | 'intro'         // 서론
  | 'methods'       // 실험방법
  | 'results'       // 결과
  | 'discussion'    // 토론·고찰
  | 'conclusion'    // 결론
  | 'supplementary' // 보충 자료

export const ASSET_SECTION_LABELS: Record<AssetSection, string> = {
  intro:         '서론',
  methods:       '실험방법',
  results:       '결과',
  discussion:    '토론·고찰',
  conclusion:    '결론',
  supplementary: '보충 자료',
}

export interface Asset {
  id: string
  project_id: string | null
  type: AssetType
  title: string
  content: string | null
  source: string | null
  reference_paper_id: string | null
  paper_section: AssetSection | null
  tags: string[]
  /** AI 추출 개념 태그 (연결 논문 상속 or 자체 추출) */
  concepts: string[]
  created_at: string
  updated_at: string
  project?: Pick<Project, 'id' | 'name'>
  reference_paper?: Pick<ReferencePaper, 'id' | 'title' | 'year' | 'journal' | 'tier' | 'concepts'>
}

export interface AssetInput {
  project_id?: string | null
  type?: AssetType
  title: string
  content?: string
  source?: string
  reference_paper_id?: string | null
  paper_section?: AssetSection | null
  tags?: string[]
}

// ── Module 3: 논증·가설 (트랙 고유) ───────────────────────

export type HypothesisStatus = 'draft' | 'active' | 'testing' | 'confirmed' | 'rejected'

export interface Hypothesis {
  id: string
  track_id: string | null
  title: string
  statement: string | null
  rationale: string | null
  status: HypothesisStatus
  tags: string[]
  created_at: string
  updated_at: string
  track?: Pick<Track, 'id' | 'name' | 'color'>
}

export interface HypothesisInput {
  track_id?: string | null
  title: string
  statement?: string
  rationale?: string
  status?: HypothesisStatus
  tags?: string[]
}

// ── Module 4: 원고 작성 (트랙 고유) ───────────────────────

export type DraftStatus = 'outline' | 'drafting' | 'revising' | 'ready' | 'submitted'

export interface Draft {
  id: string
  track_id: string | null
  journal_id: string | null
  title: string
  abstract: string | null
  body: string | null
  status: DraftStatus
  word_count: number | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  track?: Pick<Track, 'id' | 'name' | 'color'>
  journal?: Pick<Journal, 'id' | 'name'>
}

export interface DraftInput {
  track_id?: string | null
  journal_id?: string | null
  title: string
  abstract?: string
  body?: string
  status?: DraftStatus
  word_count?: number
  notes?: string
  tags?: string[]
}

// ── Module 5: Figure & Data (트랙 고유) ───────────────────

export type FigureType   = 'chart' | 'graph' | 'diagram' | 'table' | 'image' | 'other'
export type FigureStatus = 'planned' | 'draft' | 'final'

export interface Figure {
  id: string
  track_id: string | null
  draft_id: string | null
  title: string
  type: FigureType
  caption: string | null
  description: string | null
  file_url: string | null
  status: FigureStatus
  tags: string[]
  created_at: string
  updated_at: string
  track?: Pick<Track, 'id' | 'name' | 'color'>
  draft?: Pick<Draft, 'id' | 'title'>
}

export interface FigureInput {
  track_id?: string | null
  draft_id?: string | null
  title: string
  type?: FigureType
  caption?: string
  description?: string
  file_url?: string
  status?: FigureStatus
  tags?: string[]
}

// ── Module 6: 검토·피드백 (트랙 고유) ─────────────────────

export type ReviewSeverity = 'minor' | 'major' | 'critical'
export type ReviewCategory = 'methodology' | 'clarity' | 'novelty' | 'structure' | 'data' | 'other'

export interface Review {
  id: string
  draft_id: string
  track_id: string | null
  persona: string | null
  feedback: string
  severity: ReviewSeverity
  category: ReviewCategory
  resolved: boolean
  tags: string[]
  created_at: string
  updated_at: string
  draft?: Pick<Draft, 'id' | 'title'>
  track?: Pick<Track, 'id' | 'name' | 'color'>
}

export interface ReviewInput {
  draft_id: string
  track_id?: string | null
  persona?: string
  feedback: string
  severity?: ReviewSeverity
  category?: ReviewCategory
  resolved?: boolean
  tags?: string[]
}

// ── Project Dashboard ─────────────────────────────────────

export interface ProjectDashboard {
  project: Project
  tracks: (Track & {
    hypothesis_count: number
    draft_count: number
    draft_status: DraftStatus | null
  })[]
  total_reference_papers: number
  total_journals: number
  total_assets: number
}

// ── server action result ───────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
