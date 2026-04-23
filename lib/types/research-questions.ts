/**
 * Research Question 관련 타입·UI 상수.
 *
 * 여기에서 분리된 이유: `lib/actions/ai/research-questions.ts` 는 `'use server'`
 * 파일이며 Next.js 16 / Turbopack 은 해당 파일에서 **async 함수만** export 를 허용한다.
 * `DOMAIN_LABEL` 같은 상수 객체가 export 되어 있으면 모듈 전체가 로드 실패한다.
 *   (에러: `A "use server" file can only export async functions, found object.`)
 *
 * 따라서 런타임 상수 + 타입은 이 client-safe 모듈에 둔다.
 */

// ── 도메인 ─────────────────────────────────────────────────

/** 질문이 커버하는 도메인 영역 */
export type QuestionDomain =
  | 'tech'          // 기술 도메인: AI/ML 기법, 아키텍처
  | 'application'   // 응용 도메인: 타겟 분야의 현재 방법론·과제
  | 'intersection'  // 교차점: 기술이 타겟 분야에 적용된 현황
  | 'methodology'   // 평가·벤치마크·데이터셋
  | 'frontier'      // 최신 동향·미해결 과제

export const DOMAIN_LABEL: Record<QuestionDomain, string> = {
  tech:         'AI 기법',
  application:  '응용 분야',
  intersection: '교차 적용',
  methodology:  '방법론·평가',
  frontier:     '최신 동향',
}

export const DOMAIN_COLOR: Record<QuestionDomain, string> = {
  tech:         'bg-violet-900/40 text-violet-300',
  application:  'bg-teal-900/40 text-teal-300',
  intersection: 'bg-blue-900/40 text-blue-300',
  methodology:  'bg-amber-900/40 text-amber-300',
  frontier:     'bg-rose-900/40 text-rose-300',
}

// ── 구조 타입 ──────────────────────────────────────────────

export interface ResearchQuestion {
  question:      string          // 실제 검색에 쓸 영문 질문
  angle:         string          // 전략적 관점 레이블 (Korean, ≤10 chars)
  focus:         string          // 이 질문이 탐색하는 인사이트 (Korean, 1 sentence)
  domain:        QuestionDomain  // 어느 영역을 커버하는가
  coverage_note: string          // 왜 이 질문이 지금 필요한가 (Korean, 1 sentence)
}

export interface SearchHistoryItem {
  question:     string
  paperTitles:  string[]
  user_insight: string | null
}

/** 현재 커버리지 상태 — UI에 표시해서 연구자가 부족한 부분을 인식하게 함 */
export interface CoverageMap {
  tech:         number   // 탐색 횟수
  application:  number
  intersection: number
  methodology:  number
  frontier:     number
  thin_areas:   QuestionDomain[]    // 아직 부족한 영역
  summary:      string              // 한 문장 요약 (Korean)
}

export type QuestionResult =
  | { success: true;  data: ResearchQuestion[]; coverage?: CoverageMap }
  | { success: false; error: string }
