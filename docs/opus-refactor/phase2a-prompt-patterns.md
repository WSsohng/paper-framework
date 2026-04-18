# Phase 2A — 새 AI 액션 작성 가이드

Phase 2A 이후 모든 신규 AI 액션은 아래 패턴을 따른다.
기존 액션(11개)도 이 가이드를 따라 점진 전환.

---

## 1. 기본 구조

```ts
'use server'

import { generateJson } from '@/lib/ai/generate'
import { AIContextBuilder } from '@/lib/ai/context-builder'
import { composePrompt } from '@/lib/ai/prompt-composer'
import type { ActionResult } from '@/lib/types'

export async function myAiAction(
  input: MyInput,
): Promise<ActionResult<MyOutput>> {
  // 1) Context
  const { sections, meta } = await new AIContextBuilder({
    projectId: input.projectId,
    lang:      'ko',
  })
    .withResearchIntent()
    .withReferencePapers({ tierMin: 2, limit: 10 })
    .build()

  if (meta.sectionCount === 0) {
    return { success: false, error: '컨텍스트가 비어 있습니다.' }
  }

  // 2) Prompt
  const prompt = composePrompt(
    {
      role:      '당신은 …',
      objective: '…를 도출하세요.',
      reasoning: ['…', '…'],
      output: {
        kind:  'array',
        shape: `{ "title": "...", "score": 0 }`,
        count: { min: 3, max: 5 },
      },
    },
    { sections },
  )

  // 3) Call
  try {
    const data = await generateJson<MyOutput>(prompt, 0.4, {
      skipFrameworkProtocol: true,   // 대부분 true (framework protocol 이 이미 일반 지침)
      meta: { feature: 'my_feature', projectId: input.projectId },
      maxTokens: 2048,
    })
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

---

## 2. `AIContextBuilder` — DO / DON'T

### DO

- `withResearchIntent()` — 프로젝트의 `research_intent` 를 자동 포함
- `withReferencePapers({ tierMin: 2 })` — 대부분 T1·T2 만 필요
- 여러 `withAssets()` 호출로 타입별 섹션 분리 시 **반드시 `title` 지정**
- 빌더가 리턴하는 `meta.sectionCount === 0` 체크로 "컨텍스트 없음" 에러 처리
- `meta.estimatedInputTokens` 를 로그에 남겨 예산 추이 관찰

### DON'T

- `supabase.from('reference_papers').select(...)` 를 액션에서 직접 쓰지 말 것 — 빌더로 흡수
- `abstract.slice(0, N)` 하드코딩 금지 — `abstractMaxChars` 사용
- 섹션 순서 수동 정렬 금지 — 빌더가 `SECTION_ORDER` 로 고정

### 탈출구

특정 컨텍스트가 빌더에 없으면 `withCustom({ id, title, body })` 로 삽입.
`id` 가 고정 섹션 이름(`'research_intent'`, `'assets'` 등)과 같으면 해당 슬롯에 배치됨.

---

## 3. `composePrompt` — DO / DON'T

### DO

- `role` 은 한 문장, 객관적 페르소나 ("당신은 … 전문가입니다.")
- `objective` 는 한 문장 지시문 (`"…를 도출하세요."`)
- `reasoning` 은 CoT 단계 배열. 모델이 내부 사고에만 사용하도록 composer 가 명시
- `output.shape` 은 TS-like 객체 리터럴 문자열. 각 필드에 한 줄 주석 권장
- `output.count` 의 `exact` / `min` / `max` 를 정확히 지정하여 모델이 수를 맞추도록

### DON'T

- `shape` 에 trailing comma / 실제 JSON 형식 깨기 금지 — 문자열이지만 가독성 유지
- `notes` 에 output 형식 재지정 금지 (이미 `output` 에서 처리됨)
- `objective` 뒤에 바로 JSON 규칙 나열 금지 — `output` 또는 `notes` 로 이동

---

## 4. `generateJson` 호출 옵션

| 옵션 | 권장 |
|---|---|
| `skipFrameworkProtocol` | `true` (composePrompt 가 이미 충분한 지시 포함) |
| `meta.feature` | `AIFeature` 타입의 값. 새 기능이면 `lib/ai/generate.ts` + `lib/ai-feature-labels.ts` 동시 업데이트 |
| `meta.projectId` | 사용 가능하면 항상 전달 (예산 체크·사용량 집계 정확도) |
| `maxTokens` | 소형(객체 응답) 1024, 중형(배열 N≤10) 2048, 대형(배열 N≥10 + 긴 필드) 4096 |
| `temperature` | 분류·평가 0.2~0.3, 추천·생성 0.4~0.6, 창의 0.7+ |

---

## 5. 다국어

- 기본 `lang: 'ko'`. 출력이 영어가 주가 되는 도메인(저널 추천 등)에서만 `lang: 'en'`
- `AIContextBuilder` 와 `composePrompt` 의 `lang` 을 **일치** 시킬 것
- `role` / `objective` / `reasoning` 는 선택한 `lang` 과 같은 언어로 작성

---

## 6. 디버깅 팁

- 프롬프트 전문 확인:
  ```ts
  const prompt = composePrompt(task, { sections })
  console.log('[prompt]', prompt)
  ```
- 토큰 추정 확인:
  ```ts
  console.log('[estimated input tokens]', meta.estimatedInputTokens)
  ```
- 빌더의 개수 확인: `meta.paperCount`, `meta.assetCount`, `meta.questionCount`, `meta.hypothesisCount`

---

## 7. 리팩토링 체크리스트 (기존 11개 액션 전환 시)

- [ ] `supabase.from(...)` 직접 호출을 빌더 체인으로 대체
- [ ] 템플릿 리터럴(` ` ` … ` ` `) 을 `composePrompt()` 로 대체
- [ ] 섹션 헤더 `[…]` 표기 통일
- [ ] 출력 JSON 스펙을 `output.shape` 로 이동
- [ ] CoT 단계를 `reasoning[]` 로 이동
- [ ] 스냅샷(`docs/opus-refactor/phase2a-snapshots.md`)에 before/after 추가
- [ ] `npx tsc --noEmit` + `npx next build` 통과
- [ ] 로컬 Claude 실호출 1회로 응답 품질 확인
