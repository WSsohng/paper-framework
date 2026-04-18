# Phase 2A — 리팩토링 전/후 프롬프트 스냅샷

아래는 5개 액션의 프롬프트 조립 방식을 비교한 스냅샷이다.
실제 값은 프로젝트별로 달라지므로 **구조·순서·헤더** 만 비교한다.

---

## 1. `generate-hypotheses.ts`

### Before (Phase 1 시점)

```
{Framework Protocol (skipFrameworkProtocol=true 이므로 prepend 안 됨)}

당신은 학술 논문 연구 설계 전문가입니다.

아래 연구 의도를 가진 논문을 작성하려 합니다.
이 논문의 주장이 정당화되려면 어떤 가설들이 실험적으로 검증되어야 하는지 도출해주세요.

[연구 의도]
{researchIntent}

[참고문헌 — T1/T2 우선 선별, Abstract 전문 포함]
[T1] {title1} ({year}) — {journal}
{abstract1 — 2000자까지}

...

[M2 연구 자산 (인용구·메모·데이터)]
[quote] {title}: {content — 300자까지}
[note] {title}: {content}
...

[연구 아이디어 메모]
• {title}: {content — 300자까지}
...

[M0 연구 탐색 질문들]
1. {question}
2. {question}
...

---

위 정보를 종합하여 5~8개의 가설을 제안하세요.

가설 도출 방법:
1. T1/T2 참고문헌들이 각각 어떤 주장을 어떻게 증명했는지 분석하세요.
2. 이 연구 의도로 논문을 쓰려면 무엇을 증명해야 하는지 역으로 추론하세요.
3. 아이디어 메모와 연구 질문을 힌트로 활용하세요.
4. 각 가설마다 구체적인 실험 방법론을 제안하세요 (측정 지표, 비교 대상, 평가 방법).

아래 JSON 배열 형식으로만 응답하세요 (설명 없이):
[
  {
    "title": "가설의 짧은 이름 (15~40자)",
    "statement": "우리는 [구체적 주장]라고 가설을 세운다.",
    "methodology": "증명 방법: ...",
    "rationale": "근거: ..."
  }
]
```

### After

```
당신은 학술 논문 연구 설계 전문가입니다.

위 연구 의도로 논문을 쓰려면 실험적으로 검증해야 할 가설들을 도출하세요.

[연구 의도]
{researchIntent}

[참고문헌]
[T1] {title1} ({year}) — {journal}
{abstract1 — 2000자까지}
...

[연구 자산 (인용·메모·데이터)]
[quote] {title}: {content — 300자까지}
[note] {title}: {content}
...

[연구 아이디어 메모]
[idea] {title}: {content — 300자까지}
...

[연구 탐색 질문]
1. {question}
2. {question}
...

---

다음 단계로 내부 추론하세요 (출력에 단계 설명을 포함하지 마세요):
1. T1/T2 참고문헌들이 각각 어떤 주장을 어떻게 증명했는지 분석
2. 이 연구 의도로 논문을 쓰려면 무엇을 증명해야 하는지 역으로 추론
3. 아이디어 메모와 연구 질문을 힌트로 활용
4. 각 가설마다 구체적인 실험 방법론 제안 (측정 지표, 비교 대상, 평가 방법)

아래 JSON 배열 형식으로만 응답하세요 (설명·마크다운 없이, 5~8개):
[
  {
    "title": "가설의 짧은 이름 (15~40자)",
    "statement": "우리는 [구체적 주장]라고 가설을 세운다.",
    "methodology": "증명 방법: ...",
    "rationale": "근거: ..."
  }
]

순수 JSON 만 반환 — 다른 텍스트 금지.
```

### Diff 요점
- 섹션 헤더 표기 일관: `[참고문헌 — T1/T2 우선 …]` → `[참고문헌]` (제목은 고정, 필터는 내부 구현)
- `[M2 연구 자산 …]`, `[M0 연구 탐색 질문들]` 등 모듈 접두사 제거 — 내용으로 충분
- 아이디어 메모도 `[idea]` 접두사 포함 (자산 섹션과 통일)
- "다음 단계로 내부 추론" 명시 → CoT 스텝이 응답에 섞이지 않음
- 출력 JSON 개수 제약이 헤더에 포함 (`5~8개`)
- 말미 `순수 JSON 만 반환` 1줄 추가

---

## 2. `topic-recommendations.ts`

### Before

```
{Framework Protocol — prepended automatically}

You are an expert academic research strategist. Identify 4 publishable paper topics from the given literature pool.

Project: {projectName}
Research Intent: {researchIntent}

Research Questions Explored So Far (reflect the researcher's thought trajectory):
1. {q1}
2. {q2}

Researcher Insights (human expert intuition — let these guide topic selection):
1. "{insight1}"
2. "{insight2}"

Literature Pool ({N} papers, [direct] = highly relevant):
1. [direct] {title} ({year}) — {journal} — {note}
   Abstract: ...
2. ...

Follow this 3-step reasoning process internally (do NOT output the steps, only the final JSON):

STEP 1 — MAP THE LANDSCAPE
...
STEP 2 — FIND DEFENSIBLE GAPS
...
STEP 3 — DRAFT 4 PUBLISHABLE TOPICS
...

Return ONLY a valid JSON array of exactly 4 objects:
[
  { "title": ..., "angle": ..., ... }
]

Order by confidence descending. No markdown — pure JSON only.
```

### After

```
You are an expert academic research strategist.

Identify 4 publishable paper topics from the given literature pool.

[Project]
Name: {projectName}
Research Intent: {researchIntent}

[Research Questions Explored So Far (reflect the researcher's thought trajectory)]
1. {q1}
2. {q2}

[Researcher Insights (human expert intuition — let these guide topic selection)]
1. {insight1}
2. {insight2}

[Literature Pool ({N} papers, [direct] = highly relevant)]
1. [direct] {title} ({year}) — {journal} — {note}
   Abstract: ...
2. ...

---

Reason through the following steps internally (do NOT include them in the output):
1. STEP 1 — MAP THE LANDSCAPE: identify clusters, dominant methods, key debates, and obvious white spaces. Pay special attention to [direct]-tagged papers — they represent what the researcher found most relevant.
2. STEP 2 — FIND DEFENSIBLE GAPS: cross-reference the research questions explored so far with the landscape map. Identify gaps that (a) are not covered by existing papers, (b) align with the researcher's trajectory, (c) could be addressed with the methods visible in the pool.
3. STEP 3 — DRAFT 4 PUBLISHABLE TOPICS: for each topic ensure a concrete hypothesis, a novel angle, a clear gap, and a reason a top journal would accept it.

Return ONLY a valid JSON array (exactly 4 items) — no markdown, no prose:
[
  {
    "title": "Specific publishable paper title",
    "angle": "핵심 전략 관점 (Korean, max 15 chars)",
    ...
  }
]
Order by confidence descending

Pure JSON only — no other text.
```

### Diff 요점
- 모든 컨텍스트 블록이 `[Header]` 로 통일 (이전: 일부는 헤더 없이 평문)
- STEP 1/2/3 설명이 `reasoning` 단계로 수렴 — CoT 명시
- Output spec `Return ONLY a valid JSON array (exactly 4 items)` 으로 단일 문장화

---

## 3. `journal-recommendations.ts`

### Before

```
{AI_PROTOCOL_PREAMBLE 수동 prepend}

---

You are an expert academic journal consultant with deep knowledge of scientific publishing.

Based on the following research project, recommend exactly 10 suitable journals for manuscript submission.

Project Name: {projectName}
Research Intent: {researchIntent}

Requirements:
- Include a mix of high-impact journals (IF > 10) and accessible journals (IF 3–10)
- Prioritize journals that genuinely fit the research topic
...

Return ONLY a valid JSON array with exactly 10 objects in this structure:
[ ... ]

fit_level rules:
- optimal: ...
...

Order by fit_score descending. No markdown, no explanation — pure JSON only.
```

### After

```
{Framework Protocol — auto prepend (skipFrameworkProtocol 해제로 단순화)}

---

You are an expert academic journal consultant with deep knowledge of scientific publishing.

Based on the research project below, recommend exactly 10 suitable journals for manuscript submission.

[Project]
Name: {projectName}
Research Intent: {researchIntent}

---

Return ONLY a valid JSON array (exactly 10 items) — no markdown, no prose:
[
  {
    "name": "Full journal name",
    ...
  }
]
Order by fit_score descending

- Include a mix of high-impact journals (IF > 10) and accessible journals (IF 3–10).
- Prioritize journals that genuinely fit the research topic.
- Include journals from relevant fields (consider interdisciplinary options).
- Provide realistic impact factor estimates based on recent data (use null if unknown).
- fit_level rules: optimal (scope/depth/novelty all matched) | adequate (publishable but strengthen 1–2 aspects) | insufficient (below journal expectations) | excessive (journal covers much broader territory).

Pure JSON only — no other text.
```

### Diff 요점
- 기존 `AI_PROTOCOL_PREAMBLE` 수동 prepend + `skipFrameworkProtocol:true` 패턴을 `generate.ts` 기본 동작에 위임 (코드 단순화, 토큰 동일)
- Requirements → `notes` 리스트로 통일 (출력 블록 아래에 배치)
- fit_level 규칙이 단일 notes 라인으로 압축

---

## 4. `synthesize-results.ts`

### Before

```
당신은 학술 문헌 합성 전문가입니다.
다중 검색 전략으로 수집된 논문들을 원래 연구 질문 기준으로 통합 평가하세요.

[프로젝트 Research Intent]
{researchIntent}

[원래 연구 질문]
{researchQuestion}

[검색 전략 구성]
  s1 (direct_search): {N}편 검색됨
  s2 (trend_analysis): {N}편 검색됨

[합성 지시사항]
{synthesisInstruction}

[수집된 논문 목록]
[0] [출처: s1 — direct_search] "{title}" ({year}) — {journal}
    Abstract: ...
...

각 논문에 대해 아래 JSON 배열로만 응답 (인덱스 순서 유지):
[
  { "index": 0, "match": "direct" | "partial" | "unrelated", "note": "..." },
  ...
]

판정 기준:
- direct   : ...
- partial  : ...
- unrelated: ...

⚠ comparison 검색의 경우: ...

JSON 배열만 반환, 마크다운 없이.
```

### After

```
당신은 학술 문헌 합성 전문가입니다.

다중 검색 전략으로 수집된 논문들을 원래 연구 질문 기준으로 통합 평가하세요. 각 논문을 인덱스 순서 그대로 판정.

[프로젝트 Research Intent]
{researchIntent or "(없음)"}

[원래 연구 질문]
{researchQuestion}

[검색 전략 구성]
  s1 (direct_search): {N}편 검색됨
  s2 (trend_analysis): {N}편 검색됨

[합성 지시사항]
{synthesisInstruction}

[수집된 논문 목록]
[0] [출처: s1 — direct_search] "{title}" ({year}) — {journal}
    Abstract: ...
...

---

아래 JSON 배열 형식으로만 응답하세요 (설명·마크다운 없이):
[
  {
    "index": 0,
    "match": "direct" | "partial" | "unrelated",
    "note": "판단 근거 (한국어, 한 문장)"
  }
]

- direct   : 연구 질문의 핵심 주제·방법론과 명확히 관련. ...
- partial  : 간접적으로 관련 있거나 배경·맥락 참고용.
- unrelated: 질문 의도와 실질적으로 다른 논문 (명백한 false positive만).
- ⚠ comparison 검색의 경우: s1·s2 각 그룹의 purpose 에 비춰 해당 그룹에서 핵심적이면 direct 로 판정. ...

순수 JSON 만 반환 — 다른 텍스트 금지.
```

### Diff 요점
- 모든 커스텀 섹션이 빌더의 `.withCustom()` 통해 조립 — 수동 템플릿 리터럴 제거
- 판정 기준이 `notes` 블록으로 일관 배치

---

## 5. `extract-concepts.ts`

### Before

```
다음 논문을 분석해서 JSON으로만 응답하세요.

[프로젝트 Research Intent]
{researchIntent}

[논문 정보]
제목: {title}
연도: {year or "불명"}
Abstract: {abstract or "(없음)"}
메모: {notes or "(없음)"}

아래 JSON 형식으로 응답:
{
  "concepts": ["개념1", "개념2", ..., "개념N"],
  "relevance_score": 0.0~1.0,
  "relevance_reason": "한 문장으로 관련도 판단 근거"
}

규칙:
- concepts: 5~8개, ...
- relevance_score: ...
- relevance_reason: ...
```

### After

```
당신은 학술 논문 개념 추출 분석가입니다.

위 논문을 분석하여 핵심 개념과 프로젝트 연관도를 JSON 으로 반환하세요.

[프로젝트 Research Intent]
{researchIntent}

[논문 정보]
제목: {title}
연도: {year or "불명"}
Abstract: {abstract or "(없음)"}
메모: {notes or "(없음)"}

---

아래 JSON 객체 형식으로만 응답하세요 (설명·마크다운 없이):
{
  "concepts": ["개념1", "개념2", ..., "개념N"],
  "relevance_score": 0.0~1.0,
  "relevance_reason": "한 문장으로 관련도 판단 근거"
}

- concepts: 5~8개, 영어 또는 한국어 단어/구문, 논문의 핵심 방법론·데이터셋·지표·발견을 포함.
- relevance_score: Research Intent 와의 주제·방법·분야 일치도 (1.0=완벽 일치, 0.0=무관).
- relevance_reason: 왜 이 점수인지 구체적으로 (저널명·방법론·결과 언급 포함).

순수 JSON 만 반환 — 다른 텍스트 금지.
```

### Diff 요점
- `role` 명시 추가 — 이전엔 role 없이 바로 작업 지시
- 섹션/notes/output 블록 구분 명확

---

## 전반 요약

| 항목 | Before | After |
|---|---|---|
| 컨텍스트 fetch 중복 | 파일마다 Supabase query 2~4회 직접 작성 | `AIContextBuilder` 체인 1회 |
| 섹션 헤더 표기 | 파일마다 상이 (`[제목]` / `제목:` / 헤더 없음) | 일관 `[제목]` |
| `abstract.slice(N)` | 200 / 300 / 400 / 2000 혼재 | 기본값(2000) + 필요 시 config override |
| Framework protocol | 일부 수동 prepend + skipFrameworkProtocol | 자동 prepend 사용 (journal 제외는 기존 유지) |
| CoT / reasoning | 마크다운 섹션, 본문 혼입 위험 | `reasoning[]` → `내부 추론하세요` 명시 |
| Output spec | 자유 형식 | `output.kind / shape / count / orderBy` 구조화 |
| JSON 복귀 규칙 | 파일마다 다른 문구 | 말미 `순수 JSON 만 반환` 1줄 통일 |
| 토큰 추정 | 없음 | `meta.estimatedInputTokens` 제공 |

### 예상 영향
- **토큰 수**: 섹션 헤더 통일·말미 한 줄 추가로 ±5% 이내 변동 예상
- **응답 품질**: 동일한 role/objective 명시로 일관성 ↑, CoT 분리로 출력 JSON 섞임 ↓
- **유지보수**: 새 AI 액션 작성 시 boilerplate 50% 감소 (context fetch + 섹션 포맷)
