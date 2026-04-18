# Phase 2A — AI 프롬프트·컨텍스트 빌더 추상화

브랜치: `refactor/phase-2a-prompt-builder`
전제: Phase 1(papers 통합) + Phase 3-pre(예산 경량) 완료
후행: Phase 2B(흐름 맵) · Phase 3-full(예산 UI) · Phase 4(자동화)

---

## 1. 배경

현재 16개 AI 액션이 각자

```ts
supabase.from('reference_papers').select(...).eq(...).limit(...)   // fetch
.map(p => `[T${p.tier}] ${p.title} (${p.year})\n${p.abstract.slice(0, 2000)}`) // shape
.join('\n\n')

// 그 후 const prompt = `...[참고문헌]\n${paperContext}...` (template literal)
```

의 패턴을 반복한다. 결과:

- **불일치**: 같은 `reference_papers` 컨텍스트라도 파일마다 `abstract.slice(...)` 한계가 다름 (`200` / `300` / `2000`)
- **섹션 헤더 표기 제각각**: `[참고문헌]`, `[참고문헌 — T1/T2 우선 …]`, `Literature Pool (${n} papers, …)`, `## Reference Papers`
- **언어 혼재**: 한국어 태스크인데 프롬프트 중간 영어 (`STEP 1 — MAP THE LANDSCAPE`) 또는 반대
- **테스트 부재**: 프롬프트 리팩토링 시 Claude 응답이 달라지는지 확인할 수단 없음
- **신규 액션 시작 비용**: Phase 4에서 새 AI 액션 3~4개 추가 예정. 지금 기반이 없으면 똑같은 boilerplate가 복제됨

---

## 2. 범위

### 2.1 In-scope

- `lib/ai/context-builder.ts` — Supabase 쿼리 + 섹션 포맷 + 토큰 추정
- `lib/ai/prompt-composer.ts` — role / objective / reasoning / output-spec 조립
- **우선 5개 AI 액션 리팩토링** (로드맵 §Phase 2A):
  1. `lib/actions/ai/generate-hypotheses.ts`
  2. `lib/actions/ai/topic-recommendations.ts`
  3. `lib/actions/ai/journal-recommendations.ts`
  4. `lib/actions/ai/synthesize-results.ts`
  5. `lib/actions/ai/extract-concepts.ts`
- `docs/opus-refactor/phase2a-prompt-patterns.md` — 새 API 사용 가이드
- 각 리팩토링 전후 **프롬프트 문자열 스냅샷** (`docs/opus-refactor/phase2a-snapshots/<action>.before.md`, `.after.md`) — 응답 일관성 검토용

### 2.2 Out-of-scope

- 나머지 11개 AI 액션 (Phase 2A 후반에 일괄 변환 — 별도 커밋)
- Phase 3-full의 UI·기능별 quota
- AI 응답 자동 회귀 테스트 (Phase 5)

---

## 3. API 설계

### 3.1 `lib/ai/context-builder.ts`

```ts
export type PromptLang = 'ko' | 'en'

export interface PromptSection {
  id:           string    // 'research_intent' | 'reference_papers' | 'assets' | ...
  title:        string    // 렌더링된 제목
  body:         string    // 렌더링된 본문
}

export interface ContextMeta {
  projectId?:      string
  trackId?:        string
  sectionCount:    number
  paperCount?:     number
  assetCount?:     number
  questionCount?:  number
  hypothesisCount?: number
  estimatedInputTokens: number  // pricing.estimatePromptTokens 재사용
}

export class AIContextBuilder {
  constructor(opts: {
    projectId?: string
    trackId?:   string
    lang?:      PromptLang   // default 'ko'
  })

  /** Project.research_intent 포함. 값 없으면 섹션 스킵 */
  withResearchIntent(): this

  /**
   * reference_papers
   *   tierMin: 1 = T1만, 2 = T1·T2, 3 = T1~T3, null = 모든 tier
   *   limit: default 10
   *   abstractMaxChars: default 2000
   *   orderBy: 'tier' (default, nulls last) | 'year_desc' | 'priority_score_desc'
   */
  withReferencePapers(opts?: {
    tierMin?:           1 | 2 | 3 | null
    limit?:             number
    abstractMaxChars?:  number
    orderBy?:           'tier' | 'year_desc' | 'priority_score_desc'
  }): this

  /**
   * assets
   *   types: default 모든 타입
   *   limit: default 8
   *   contentMaxChars: default 300
   */
  withAssets(opts?: {
    types?:           AssetType[]
    limit?:           number
    contentMaxChars?: number
  }): this

  /** discovery_rounds.question (M0 연구 질문) */
  withDiscoveryQuestions(opts?: { limit?: number }): this

  /** hypotheses (M3) */
  withHypotheses(opts?: {
    status?: HypothesisStatus[]
    limit?:  number
  }): this

  /** 프로젝트 외부에서 직접 제공하는 인사이트 리스트 */
  withUserInsights(list: string[], title?: string): this

  /** 커스텀 섹션 직접 삽입 */
  withCustom(section: PromptSection): this

  async build(): Promise<{ sections: PromptSection[]; meta: ContextMeta }>
}
```

**렌더링 규칙:**
- 섹션 순서는 호출 순서가 아니라 **고정 순서**:
  `research_intent → reference_papers → assets → discovery_questions → hypotheses → user_insights → custom(1..n)`
- 섹션 본문이 비면 (e.g. 쿼리 결과 0건) 자동 스킵
- 모든 텍스트 필드는 UTF-8 기준 `substring(0, maxChars)` 로 고정 (한국어 한 글자도 1)
- 토큰 추정은 `lib/ai/pricing.ts#estimatePromptTokens` 재사용

### 3.2 `lib/ai/prompt-composer.ts`

```ts
export interface OutputSpec {
  kind:     'array' | 'object'
  /** TS interface 형식의 shape 문자열. 예:
   *  "{ title: string; confidence: number; rationale: string }"
   */
  shape:    string
  count?:   { min?: number; max?: number; exact?: number }
  orderBy?: string          // "confidence descending"
}

export interface PromptTask {
  /** "당신은 학술 논문 연구 설계 전문가입니다." */
  role:       string
  /** 한 문장 목표 */
  objective:  string
  /** CoT 가이드 (배열). 없으면 스킵 */
  reasoning?: string[]
  /** 출력 JSON 스펙 */
  output:     OutputSpec
  /** Do/Don't 추가 노트 */
  notes?:     string[]
  /** 언어 힌트 (출력 언어에 영향) */
  lang?:      PromptLang
}

/**
 * task + ctx.sections → 최종 프롬프트 문자열.
 * withFrameworkProtocol() 은 generate.ts 가 옵션에 따라 붙이므로 여기서 붙이지 않음.
 */
export function composePrompt(
  task: PromptTask,
  ctx: { sections: PromptSection[] },
): string
```

**생성 형태 (ko 기준):**

```
<role>

<objective>

[Section1 Title]
<Section1 body>

[Section2 Title]
<Section2 body>
...

---

<reasoning steps (optional, 번호 붙여서)>

<output spec 블록>

<notes (optional)>
```

**Output spec 블록 렌더링 예:**

```
아래 JSON 배열 형식으로만 응답하세요 (설명 없이, 정확히 4개):
[
  {
    "title": string,
    "confidence": number,  // 0~100
    "rationale": string
  }
]
confidence 내림차순 정렬.
```

### 3.3 통합 지점

`generateJson()` 시그니처는 **변경하지 않는다** (로드맵 §실행 가드레일 "변경 금지"). 대신 호출부 패턴이 다음으로 표준화됨:

```ts
const { sections, meta } = await new AIContextBuilder({ projectId })
  .withResearchIntent()
  .withReferencePapers({ tierMin: 2, limit: 10 })
  .withAssets({ types: ['quote', 'note'], limit: 8 })
  .withDiscoveryQuestions({ limit: 10 })
  .build()

const prompt = composePrompt(
  {
    role:      '당신은 학술 논문 연구 설계 전문가입니다.',
    objective: '연구 의도에 맞는 가설 5~8개를 도출하세요.',
    reasoning: [
      'T1/T2 참고문헌들의 주장을 분석',
      '아이디어·연구질문을 역으로 추론',
      '각 가설에 구체적 실험 방법론 제안',
    ],
    output: {
      kind: 'array',
      shape: `{ title: string; statement: string; methodology: string; rationale: string }`,
      count: { min: 5, max: 8 },
    },
  },
  { sections },
)

const proposals = await generateJson<HypothesisProposal[]>(prompt, 0.5, {
  skipFrameworkProtocol: true,
  meta: { feature: 'hypothesis_generation', projectId },
  maxTokens: 4096,
})
```

---

## 4. 구현 순서

| 커밋 | 내용 | 검증 |
|---|---|---|
| **C1** | `context-builder.ts` + `prompt-composer.ts` + 타입 | tsc + build |
| **C2** | `generate-hypotheses.ts` 리팩토링 + 스냅샷 | diff 검토 + 로컬 AI 1회 호출 |
| **C3** | `topic-recommendations.ts` 리팩토링 + 스냅샷 | ↑ |
| **C4** | `journal-recommendations.ts` 리팩토링 + 스냅샷 | ↑ |
| **C5** | `synthesize-results.ts` 리팩토링 + 스냅샷 | ↑ |
| **C6** | `extract-concepts.ts` 리팩토링 + 스냅샷 | ↑ |
| **C7** | `phase2a-prompt-patterns.md` 가이드 문서 | - |
| **Gate** | 사용자 확정 게이트 (통과 시 main 머지) | - |

각 C2~C6은 **"원본 프롬프트 스냅샷"→"리팩토링 후 스냅샷"→"diff 요약"** 을 남긴다. Claude 실제 호출은 사용자 로컬에서 선택적으로 수행 (토큰 비용 발생).

---

## 5. 기본값 (defaults)

| 항목 | 기본값 | 근거 |
|---|---|---|
| `lang` | `'ko'` | 프로젝트 주 언어 |
| `withReferencePapers.limit` | 10 | 현재 `generate-hypotheses` 기준 |
| `withReferencePapers.abstractMaxChars` | 2000 | 긴 abstract 케이스 대응 (`generate-hypotheses` 기준) |
| `withReferencePapers.tierMin` | 2 (T1·T2) | 대부분 액션이 상위 tier 위주 |
| `withReferencePapers.orderBy` | `'tier'` | nulls last |
| `withAssets.limit` | 8 | 현행 공통값 |
| `withAssets.contentMaxChars` | 300 | 인용·메모 요약용 |
| `withDiscoveryQuestions.limit` | 10 | 최근 10 라운드 |
| 섹션 헤더 | `[Title]` | 현행 파일 대다수 패턴 |
| `reasoning` 렌더링 | 번호 붙은 리스트 | CoT 가이드 관행 |

---

## 6. 리스크

| # | 리스크 | 완화 |
|---|---|---|
| R2A-1 | 리팩토링 후 Claude 응답 품질 저하 | 스냅샷 비교 + 사용자 로컬 검증 (C2~C6) |
| R2A-2 | 섹션 표현이 달라져 토큰 수가 증가 | `estimatePromptTokens` 로 before/after 비교, `+10%` 초과 시 재조정 |
| R2A-3 | 5개 이외 액션과 빌더가 맞지 않음 | 빌더에 `withCustom()` 탈출구 제공 |
| R2A-4 | Phase 4 착수 시 새 액션에 또 boilerplate 반복 | 가이드 문서(`phase2a-prompt-patterns.md`)로 강제 |

---

## 7. Phase 2A 확정 게이트 질문

### Q1. 섹션 헤더 스타일

- (a) `[제목]` — 현행 다수
- (b) `## 제목` — markdown, Claude가 더 잘 구분
- (c) `=== 제목 ===` — text art

**Opus 추천: (a)** (기존 응답 품질이 이 스타일로 안정화되어 있음)

### Q2. 프롬프트 언어 기본

- (a) `lang: 'ko'` 기본, 영문 액션은 override
- (b) 태스크별 지정 필수 (기본 없음)
- (c) 프로젝트 설정 필드 추가

**Opus 추천: (a)**

### Q3. 스냅샷 문서화 범위

- (a) 5개 액션 before/after `.md` 파일로 저장 (권장)
- (b) 커밋 메시지에만 요약
- (c) 생략

**Opus 추천: (a)** — 나중에 회귀 검증 근거

### Q4. 스냅샷 검증

사용자가 C2~C6마다 Claude 실제 호출로 "응답 품질 동일 또는 개선" 확인?

- (a) 각 커밋 단위로 확인
- (b) 전부 끝난 뒤 일괄 확인
- (c) 스킵 (프롬프트 diff만 보고 통과)

**Opus 추천: (b)** — 병합 효율

### Q5. 나머지 11개 액션

- (a) Phase 2A 내에서 일괄 변환 (scope 확대)
- (b) Phase 2A는 5개만, 나머지는 Phase 5 검증 단계에서
- (c) 기회 있을 때마다 개별 변환

**Opus 추천: (b)**
