/**
 * PaperFactory — governing philosophy (single source of truth).
 * Used by: /insights, dashboard, and AI prompts (token-conscious).
 */

export const FRAMEWORK_MASTER_INSIGHT = {
  title:
    '연구자의 직관이 주도하고, AI가 프로토콜을 가속한다',

  body:
    '첫 아이디어에서 출발해 단계마다 사람의 통찰이 방향을 정한다. AI는 중간 실행(옵션·초안·검색·정리)을 빠르게 안내하고, 연구자는 처음부터 끝까지 모든 것을 손으로 하지 않고 선택·조정·인사이트로 관여한다.',

  /** 80 / 20 — 짧게 */
  split:
    '절차·반복 작업은 AI가 대부분 담당하고, 방향·통찰·최종 판단은 사람이 맡는다.',

  splitRatio: '자동화·가속 구간 ≈ 80% · 선택·수정·통찰 ≈ 20%',

  principleEn:
    'Human intuition leads · AI accelerates the protocol · You choose, steer, and add insight',

  /** UI용 짧은 단계 (루프) */
  protocolSteps: [
    'Intent·아이디어',
    'AI 옵션',
    '선택·인사이트',
    '가속 실행',
    '다음 단계',
  ] as const,
} as const

/**
 * Prepended to reasoning prompts. English keeps tokens low; models follow well.
 */
export const AI_PROTOCOL_PREAMBLE = `
[System protocol — PaperFactory]
- Lead: The researcher's intent and intuition are primary. You accelerate execution; you do not replace judgment or originality.
- Output: Clear, concise, ranked options aligned with the user's stated intent. The user selects, edits, and adds insight at every step.
- Work split: Aim for ~80% procedural acceleration (options, drafts, search scaffolding); ~20% remains human steering, correction, and insight — reflect that in tone (support, don't overclaim).
- Never contradict the user's research intent; if ambiguous, surface 2–3 clarifying angles as choices, not as final truth.
`.trim()

export function withFrameworkProtocol(userPrompt: string): string {
  return `${AI_PROTOCOL_PREAMBLE}\n\n---\n\n${userPrompt}`
}

// ── 모듈별 가이드 기준 (Guide Basis) ─────────────────────
// 각 모듈 AI 호출 시 어떤 컨텍스트를 사용하는지 명시.
// - /insights 페이지에서 표시 → 개발자가 보고 프롬프트 수정 포인트로 활용.
// - 실제 프롬프트에서 이 항목들을 참조해야 AI 가이드 품질이 일관됨.

export interface ModuleGuideBasis {
  module:   string
  tag:      string
  inputs:   string[]   // AI가 참조하는 정보 목록
  goal:     string     // 이 모듈 가이드의 목적 (Korean)
}

// ── 모듈별 사용 설명서 (Usage Guide) ─────────────────────
// "어떻게 써야 하는가" — 실전 매뉴얼.
// - /insights 페이지에서 사용 설명서로 표시.
// - 각 단계의 AI 가이드 메시지를 생성할 때 이 내용을 참조.
// - 수정 → 프레임워크 동작 방향 변경.

export interface ModuleStep {
  label: string    // 단계 이름 (짧게)
  by:    'human' | 'ai' | 'both'
  desc:  string    // 무엇을 하는가
}

export interface ModuleUsageGuide {
  tag:       string
  name:      string
  href:      string
  /** 이 모듈을 시작하는 조건 */
  trigger:   string
  /** 핵심 흐름 — 순서대로 */
  steps:     ModuleStep[]
  /** 다음 단계로 넘어가는 완료 기준 */
  done_when: string
  /** 실전에서 자주 막히는 지점 + 해결 힌트 */
  tips:      string[]
}

export const MODULE_USAGE_GUIDE: ModuleUsageGuide[] = [
  {
    tag:  'M0',
    name: '문헌 탐색 & 주제 설정',
    href: '/reference-papers?view=discover',
    trigger:
      '프로젝트 생성 직후. Research Intent(연구 핵심 아이디어)를 한 문장 이상 입력했을 때 시작.',
    steps: [
      { by: 'human', label: 'Research Intent 작성',     desc: '프로젝트 편집 → Research Intent 칸에 "왜 이 연구인가"를 1~3문장으로 적는다. 완벽하지 않아도 됨. AI가 이 문장을 기준으로 모든 것을 시작한다.' },
      { by: 'ai',    label: '전략 질문 5개 생성',        desc: 'AI 탐색 탭 → "질문 생성" 클릭. AI가 시의성·격차·방법론·인용 영향을 고려한 전략적 질문 5개를 제안한다.' },
      { by: 'human', label: '질문 선택 + 인사이트 추가', desc: '5개 중 가장 날카롭다고 느끼는 질문을 클릭. 선택 이유나 직관을 인사이트 칸에 짧게 적는다. 이 메모가 AI 다음 질문에 누적 반영된다.' },
      { by: 'ai',    label: '논문 검색 (Semantic Scholar)', desc: 'Semantic Scholar에서 실제 발표된 논문을 검색해 제목·저자·연도·초록을 가져온다. 가짜 논문 없음.' },
      { by: 'human', label: '논문 저장 & 티어 분류',     desc: '검색 결과 중 관련 있는 논문을 저장. 저장 후 참고문헌 목록에서 T1(경쟁)·T2(근거)·T3(배경)으로 분류한다.' },
      { by: 'ai',    label: '후속 질문 생성 (반복)',      desc: '라운드가 쌓일수록 AI는 이전 질문·인사이트·발견된 논문을 고려해 더 날카로운 후속 질문을 만든다.' },
      { by: 'ai',    label: 'AI 주제 추천 (pool 15편+)', desc: '논문 pool이 충분히 쌓이면 오른쪽 패널에서 투고 가능한 논문 주제 4개를 추천. 클릭하면 트랙 생성으로 이행.' },
    ],
    done_when:
      '참고문헌 15편 이상 + T1 논문 2편 이상 분류 + 트랙(세부 연구 주제) 1개 이상 생성 완료.',
    tips: [
      'Research Intent가 구체적일수록 AI 질문 품질이 높아진다. "AI를 분석화학에 적용"보다 "foundation model의 zero-shot 능력을 NIR 스펙트럼 분류에 처음 적용한다"처럼 쓰면 좋다.',
      'T1 논문이 없으면 시의성 분석이 작동하지 않는다. 경쟁 논문이 될 만한 것은 T1로 반드시 분류하자.',
      '인사이트가 쌓일수록 AI 주제 추천의 방향이 연구자의 직관에 가까워진다. 매 라운드마다 짧게라도 적는 것이 핵심.',
    ],
  },
  {
    tag:  'M1',
    name: '저널 인텔리전스',
    href: '/journal',
    trigger:
      'M0에서 논문 주제 / 트랙 방향이 어느 정도 잡혔을 때. "어느 저널에 낼 것인가"를 미리 정해야 논문 구조가 달라진다.',
    steps: [
      { by: 'ai',    label: 'AI 저널 10개 추천',   desc: '저널 페이지 → "✦ AI 저널 추천" 클릭. Research Intent 기반으로 10개 후보를 IF·Fit(최적/적절/부족/과잉) 분석과 함께 제시.' },
      { by: 'human', label: '후보 선택 & 저장',     desc: '추천 중 3~5개를 선택해 "후보(shortlisted)"로 저장. Fit이 "최적"이더라도 IF가 너무 높으면 전략적으로 제외 가능.' },
      { by: 'human', label: '저널 직접 추가',       desc: '"+ 직접 추가"에서 저널명 2글자 이상 입력 → OpenAlex 자동완성으로 IF·출판사·ISSN이 채워진다. Scope(게재 범위)는 직접 입력.' },
      { by: 'human', label: 'shortlisted 카드 비교', desc: '후보 저널들이 2열 카드로 나란히 보인다. IF·Fit·Scope·메모를 한눈에 비교해 1~2개로 좁힌다.' },
      { by: 'human', label: '목표 저널 1개 결정',   desc: '최종 투고 저널을 확정. 이 저널의 Scope가 M3(가설)·M4(초고) 작성의 기준이 된다.' },
    ],
    done_when:
      'shortlisted 저널 2개 이상 + 목표 저널 1개 확정 (notes에 "주 투고"라고 메모 권장).',
    tips: [
      '목표 저널을 일찍 정할수록 논문 구조·분량·실험 설계가 그 저널에 맞춰진다. 저널 결정 전 가설을 세우면 나중에 재작업이 생길 수 있다.',
      'IF가 높은 저널을 무조건 고르지 말 것. Fit이 "과잉"이면 리뷰어가 "범위 밖"이라고 거절할 수 있다.',
      '저널 홈페이지의 "Author Guidelines"를 한 번 읽고 notes에 page limit·figure 수 제한을 메모해 두면 M4에서 바로 쓸 수 있다.',
    ],
  },
  {
    tag:  'M2',
    name: '자산 라이브러리',
    href: '/assets',
    trigger:
      'M0 탐색과 병행 가능. 참고문헌을 읽으면서 논문에 쓸 인용구·데이터·그림을 즉시 저장한다.',
    steps: [
      { by: 'ai',    label: 'AI 인사이트 추출',     desc: '"✦ AI 인사이트 추출" → 논문 선택 → abstract/메모 분석 → 3~5개 인용구·메모를 논문 섹션과 함께 제안. 체크 후 저장.' },
      { by: 'human', label: '출처 논문 연결',        desc: '자산 추가/수정 시 "출처 논문" 선택 → 어떤 참고문헌에서 왔는지 연결. 티어(T1/T2/T3)가 함께 표시된다.' },
      { by: 'human', label: '논문 섹션 지정',        desc: '이 자산이 서론·방법론·결과·토론·결론 중 어디에 쓸지 지정. M4 초고 생성 시 AI가 이 정보를 참조해 더 정확한 위치에 자산을 배치한다.' },
      { by: 'human', label: '섹션별 뷰로 점검',      desc: '"섹션별" 탭 → 각 섹션에 자산이 고르게 있는지 확인. 결과 섹션에 자산이 없으면 논문이 약해진다.' },
    ],
    done_when:
      '논문 주요 섹션(서론·방법·결과 최소 각 1개)에 자산이 배치됨. 총 5개 이상 권장.',
    tips: [
      '자산 없이 M4에서 AI 초고를 생성하면 빈 뼈대만 나온다. M2 자산이 M4 품질을 결정한다.',
      'T2 논문(핵심 근거)의 인용구를 우선 추출하자. 이것이 논문 논증의 뼈대가 된다.',
      '"참고문헌" 유형 자산에는 DOI나 정확한 인용 형식을 저장해 두면 나중에 reference 정리가 훨씬 빠르다.',
    ],
  },
  {
    tag:  'M3',
    name: '논증 설계',
    href: '/architect',
    trigger:
      'M0 주제 확정 + M1 목표 저널 결정 후. "무엇을 증명할 것인가"가 명확해야 실험을 설계할 수 있다.',
    steps: [
      { by: 'ai',    label: 'AI 가설 초안 생성',    desc: '(구현 예정) Research Intent + T1·T2 논문 + 목표 저널 Scope → AI가 핵심 주장 가설 3~5개 제안.' },
      { by: 'human', label: '가설 선택 & 수정',      desc: '제안된 가설 중 가장 자신의 직관과 맞는 것을 선택하거나 직접 입력. 가설은 "A를 B 방법으로 하면 C 결과가 나온다"처럼 검증 가능하게 써야 한다.' },
      { by: 'ai',    label: 'AI 코어 실험 설계',    desc: '(구현 예정) 선택된 가설 → AI가 핵심 실험 1~2개 설계. 이 실험 결과에 따라 논문 수립 여부가 결정된다.' },
      { by: 'human', label: '실험 진행',              desc: '실제 실험은 연구자의 몫. Track 단계를 "실험 진행 중"으로 변경.' },
      { by: 'ai',    label: 'AI 실험값 검증',       desc: '(구현 예정) 실험 결과 입력 → AI가 통계적 유의성·가설 지지 여부 분석 → 필요시 재설계 피드백.' },
    ],
    done_when:
      '가설 1개 이상 "confirmed" 상태 + Track 단계가 "실험 진행" 이후.',
    tips: [
      '가설은 처음부터 완벽할 필요 없다. "draft"로 시작해 실험하면서 "testing → confirmed"로 올리면 된다.',
      '목표 저널의 scope를 가설에 반영하자. 저널이 "high-throughput screening"을 중시하면 가설도 그 관점을 포함해야 accept 가능성이 높아진다.',
      'T1 논문(경쟁)과의 차별점을 가설에 명시하면 레드팀(M6) 단계에서 훨씬 강한 논문이 나온다.',
    ],
  },
  {
    tag:  'M4',
    name: '초고 공장',
    href: '/draft',
    trigger:
      'M3에서 가설이 "confirmed" 상태가 된 후. 실험 데이터가 일부라도 있으면 초고를 먼저 구조화할 수 있다.',
    steps: [
      { by: 'human', label: '초고 생성',             desc: '"+ 새 초고"에서 제목·트랙·목표 저널을 연결해 초고를 만든다.' },
      { by: 'ai',    label: 'AI 섹션별 초안',        desc: '(구현 예정) confirmed 가설 + M2 자산(섹션 지정된 것) + 저널 scope → AI가 서론/방법/결과/토론/결론 각 섹션 초안 생성.' },
      { by: 'human', label: '초안 수정',              desc: '각 섹션을 직접 수정. AI 초안은 출발점일 뿐 — 실험의 맥락과 연구자만 아는 뉘앙스를 추가한다.' },
      { by: 'human', label: '상태 업데이트',          desc: 'outline → drafting → revising → ready 순서로 상태를 관리한다.' },
    ],
    done_when:
      '초고 상태가 "ready" + abstract 작성 완료.',
    tips: [
      '서론은 T3 논문으로, 방법론 비교는 T2, 우리 연구의 차별성은 T1과의 대비로 구성하면 자연스러운 흐름이 나온다.',
      '단어 수 목표를 먼저 정하고 섹션별로 배분하자. 대부분 저널은 5,000~8,000 words (본문 기준).',
      'Discussion에서 "한계"를 먼저 쓰는 것이 역설적으로 강한 논문이 된다. 약점을 먼저 인정하고 그 다음에 의의를 밝히는 구조가 리뷰어 호감을 산다.',
    ],
  },
  {
    tag:  'M5',
    name: '도표 & 데이터',
    href: '/figures',
    trigger:
      'M3 실험 진행과 병행. 데이터가 나오는 즉시 Figure 계획을 세운다.',
    steps: [
      { by: 'human', label: 'Figure 계획',           desc: '논문에 들어갈 그림·표 목록을 미리 작성. 각 Figure가 어떤 가설을 지지하는지 연결한다.' },
      { by: 'ai',    label: '(예정) 캡션 자동 생성', desc: '실험값 + 가설 → AI가 Figure 캡션 초안 생성.' },
      { by: 'human', label: '최종본 확정',            desc: '상태를 planned → draft → final로 관리.' },
    ],
    done_when:
      '논문의 핵심 주장을 뒷받침하는 Figure 최소 2개 "final" 상태.',
    tips: [
      '"Figure 1"은 논문의 핵심 주장을 한 눈에 보여주는 개요 그림이 가장 강력하다. 리뷰어는 Abstract 다음 Figure 1을 본다.',
      'Table은 비교·수치 데이터에, Figure는 트렌드·메커니즘 시각화에 적합하다.',
    ],
  },
  {
    tag:  'M6',
    name: '레드팀 & 제출',
    href: '/redteam',
    trigger:
      'M4 초고가 "ready" 상태 + M5 주요 Figure 완성 후.',
    steps: [
      { by: 'ai',    label: '(예정) AI 리뷰어 공격', desc: '목표 저널 리뷰어 프로필로 AI가 적대적 피드백 생성 — methodology, novelty, clarity, data 카테고리별.' },
      { by: 'human', label: '피드백 검토 & 수정',    desc: '각 리뷰 항목을 검토. critical은 반드시, major는 가능하면 수정. 수정 후 "resolved" 처리.' },
      { by: 'human', label: '제출',                  desc: '모든 critical/major 해결 → 초고 상태를 "submitted"로 변경 → 저널 상태를 "submitted"로 업데이트.' },
    ],
    done_when:
      'critical 리뷰 전체 resolved + 초고 submitted 상태.',
    tips: [
      '"critical"을 하나라도 미해결 상태로 제출하지 말 것. 실제 리뷰어가 같은 지적을 하면 major revision 또는 rejection이 된다.',
      '제출 전 저자 이름·소속·이해충돌 선언·윤리 선언 등 administrative 항목도 저널 가이드라인대로 체크하자.',
    ],
  },
]

export const MODULE_GUIDE_BASIS: ModuleGuideBasis[] = [
  {
    module:  '문헌 탐색 & 주제 설정',
    tag:     'M0',
    inputs:  [
      'Research Intent (프로젝트 핵심 아이디어)',
      '1티어 논문 목록 & 발행 주기 (시의성)',
      '2·3티어 논문 pool',
      '연구자의 인사이트 주석 (각 라운드)',
    ],
    goal:    '최신 동향 기반 전략적 연구 질문 제시 → 논문 pool 누적 → 투고 가능한 주제 도출',
  },
  {
    module:  '저널 인텔리전스',
    tag:     'M1',
    inputs:  [
      'Research Intent',
      '1티어 논문들의 주요 게재 저널',
      '트랙의 현재 단계 (Track Stage)',
      '목표 Impact Factor 범위 (사용자 설정 시)',
    ],
    goal:    '연구 범위·수준과 저널 Fit 평가 (적절/부족/과잉) → 전략적 저널 선택 지원',
  },
  {
    module:  '자산 라이브러리',
    tag:     'M2',
    inputs:  [
      '참고문헌 (2·3티어 인용 위주)',
      '트랙 Research Intent',
    ],
    goal:    '핵심 인용문·데이터·도표를 프로젝트 공유 자산으로 구조화',
  },
  {
    module:  '논증 설계',
    tag:     'M3',
    inputs:  [
      '1티어 논문 (선행 연구와 차별점 확인)',
      '2티어 논문 (추론 근거)',
      'Research Intent & 목표 저널 scope',
      '트랙 컨텍스트 로그 (이전 결정 사항)',
    ],
    goal:    'AI 가설 수립 → 코어 실험 설계 → 실험값 검증 · 재설계 피드백',
  },
  {
    module:  '초고 공장',
    tag:     'M4',
    inputs:  [
      'confirmed 가설 & 실험값 요약',
      '목표 저널 scope & 작성 가이드라인',
      '1·2티어 논문 (서론 레퍼런스)',
      '트랙 컨텍스트 로그',
    ],
    goal:    '논문 구조(서론/실험방법/결과/토론/결론) 자동 초안 → 저널 포맷 정렬',
  },
  {
    module:  '도표 & 데이터',
    tag:     'M5',
    inputs:  [
      '가설 & 실험값',
      '초고 섹션 구조',
      '목표 저널의 도표 가이드라인',
    ],
    goal:    '실험값 → Figure·Table 계획 및 캡션 자동 생성 → 초고와 연결',
  },
  {
    module:  '레드팀 & 제출',
    tag:     'M6',
    inputs:  [
      '목표 저널 리뷰어 프로필 (저널 scope 기반 추정)',
      '완성된 초고',
      'confirmed 가설 & Figure 목록',
      '1티어 논문 (신규성 비교 기준)',
    ],
    goal:    '다양한 리뷰어 페르소나로 적대적 피드백 생성 → 취약점 보강 → 제출 준비',
  },
]
