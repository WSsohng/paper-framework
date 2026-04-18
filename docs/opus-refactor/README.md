# Opus Refactor — 사용 안내

이 폴더는 **Opus 4.7 high**로 진행할 대형 리팩토링의 작업 공간입니다. 일상적인 기능 개발(Sonnet medium)과 분리된 고밀도 구조 개선 작업을 담습니다.

## 폴더 구조

```
docs/opus-refactor/
├── README.md                  ← 이 문서
├── roadmap.md                 ← 5개 Phase 통합 로드맵 (마스터 문서)
├── 00-baseline.md             ← Phase 0 산출물 (Opus가 작성)
├── 01-risks.md                ← Phase 0 산출물 (Opus가 작성)
├── phase1-design.md           ← Phase 1 산출물
├── phase2a-prompt-patterns.md ← Phase 2A 산출물
├── phase2b-flow-map.md        ← Phase 2B 산출물
├── final-architecture.md      ← Phase 5 산출물
└── migration-log.md           ← Phase 5 산출물
```

`roadmap.md`가 단일 진입점입니다. 먼저 이 파일을 읽으세요.

---

## Opus 세션 시작 프롬프트

새 Opus 4.7 high 세션을 시작할 때 다음 문구로 시작하세요:

```
이 리포지토리는 Next.js 16 + Supabase 기반의 논문 작성 프레임워크다.

docs/opus-refactor/roadmap.md 를 먼저 읽고 전체 5개 Phase 로드맵을 파악하라.
그 다음 진행 상태 표를 확인해 다음 실행할 Phase를 식별하고 순차 실행한다.

중요 규칙:
1. 각 Phase는 refactor/phase-N-xxx 브랜치에서 작업 후 PR로 main에 병합한다.
2. Phase 끝마다 반드시 사용자에게 확정 게이트를 요청한다. 통과 전까지 다음 Phase 금지.
3. 프로젝트 규칙은 AGENTS.md를 준수한다 (이 Next.js는 training data와 다르다).
4. 마이그레이션은 항상 UP + DOWN 쌍. 실행 전 Supabase 백업 확인.
5. 예상 밖 복잡도 발견 시 즉시 중단하고 사용자에게 보고.

Phase 0부터 시작하라.
```

---

## Phase 전환 규칙

각 Phase 완료 시:

1. Opus가 `roadmap.md` 의 **진행 상태 표**를 업데이트 (상태, 브랜치, PR 링크)
2. 해당 Phase 산출물 문서를 이 폴더에 커밋
3. 사용자에게 확정 게이트 요청
4. 사용자 확정 후에만 다음 Phase 진입

---

## 모드 분리 원칙

| 작업 유형 | 모델 | 작업 위치 |
|---|---|---|
| 일상 기능 개발, 버그 수정, UI 추가 | Sonnet medium | `main` 브랜치 직접 |
| 구조 리팩토링, 아키텍처 변경 | **Opus high** | `refactor/phase-*` 브랜치 |
| 프롬프트 초안 설계 | Opus high | Phase 2A 범위 |
| 프롬프트 미세조정 | Sonnet medium | 일상 개발 흐름 |

Phase 진행 중에도 main 브랜치의 일상 개발은 병렬 가능. 단, Phase 1처럼 대규모 스키마 변경 Phase는 main과 동기화 주의.

---

## 문제 발생 시

- **Phase 중 DB 마이그레이션 실패** → 즉시 DOWN 스크립트 실행, Phase 재설계
- **main과 conflict 심함** → Phase 브랜치에 main merge → conflict 해결 → PR 업데이트
- **Opus가 잘못된 판단을 함** → 해당 Phase PR 닫고 원인 기록 후 재시작
