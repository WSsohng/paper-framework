# PaperFactory — 프레임워크 설명서

> 학술 논문 작성 전 과정을 체계적으로 관리하는 연구자를 위한 워크플로우 프레임워크

---

## 목차

1. [개요](#1-개요)
2. [핵심 개념: 계층 구조](#2-핵심-개념-계층-구조)
3. [데이터 모델](#3-데이터-모델)
4. [모듈 파이프라인](#4-모듈-파이프라인)
5. [워크플로우 가이드](#5-워크플로우-가이드)
6. [기술 스택](#6-기술-스택)
7. [시작하기](#7-시작하기)

---

## 1. 개요

PaperFactory는 "아이디어 발굴 → 저널 분석 → 논거 구축 → 초고 작성 → 제출"까지,
논문 한 편이 완성되기까지의 전 과정을 하나의 공간에서 관리하는 연구 관리 시스템입니다.

**설계 원칙:**
- 연구 아이디어(프로젝트)를 최상위로, 세부 연구 주제(트랙)를 그 아래에 체계적으로 배치
- 여러 트랙이 공통 자원(참고문헌, 저널, 자산)을 공유
- 각 트랙은 독립적인 논증·초고·그림·리뷰 사이클을 가짐
- AI 지원을 위한 구조화된 데이터 설계 (Research Intent 필드 등)

---

## 2. 핵심 개념: 계층 구조

```
프로젝트 (Project)
│  예: "AI × 분석화학 융합 연구"
│
├── 공유 자원 (Project-level)
│   ├── 참고문헌 (Reference Papers)  — 모든 트랙이 함께 쌓는 문헌 풀
│   ├── 저널 (Journals)              — 투고 후보 저널 분석 및 추적
│   └── 자산 (Assets)               — 인용구, 데이터, 그림 등 재사용 소재
│
└── 트랙 (Track)
    │  예: "Foundation Model → NIR 적용"
    │      "파운데이션 모델 IR 스펙트럼 분석" (상위 트랙의 후속 연구)
    │
    └── 트랙 고유 자원 (Track-level)
        ├── 논문 (Papers)       — 이 트랙에서 집중 분석하는 논문
        ├── 가설 (Hypotheses)   — 연구 논증 및 가설 추적
        ├── 초고 (Drafts)       — 논문 초고 버전 관리
        ├── 그림 (Figures)      — 논문용 그림·차트 계획
        └── 리뷰 (Reviews)      — Red Team 피드백 관리
```

### 트랙 간 관계

| 관계 유형 | 설명 | 예시 |
|-----------|------|------|
| **병렬 (parallel)** | 동시에 독립적으로 진행 | NIR 적용 + IR 적용을 동시에 실험 |
| **순차 (sequential)** | 이전 트랙의 결과를 이어받아 진행 | 기초 실험 → 심화 분석 → 응용 연구 |

---

## 3. 데이터 모델

### 테이블 구조

#### `projects` — 최상위 연구 아이디어
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK |
| `name` | text | 프로젝트 이름 |
| `research_intent` | text | 핵심 연구 질문/가설 |
| `description` | text | 상세 설명 |
| `status` | enum | `active` \| `paused` \| `completed` \| `archived` |
| `tags` | text[] | 분류 태그 |

#### `tracks` — 세부 연구 주제 (트랙)
| 필드 | 타입 | 설명 |
|------|------|------|
| `project_id` | uuid → projects | 소속 프로젝트 |
| `parent_track_id` | uuid → tracks | 상위 트랙 (후속 연구 구조) |
| `relation_type` | enum | `parallel` \| `sequential` |
| `name` | text | 트랙 이름 |
| `research_intent` | text | 이 트랙의 세부 연구 질문 |
| `color` | text | UI 식별 색상 |
| `status` | enum | `active` \| `paused` \| `archived` |

#### `reference_papers` — 프로젝트 공유 참고문헌
| 필드 | 타입 | 설명 |
|------|------|------|
| `project_id` | uuid → projects | 소속 프로젝트 |
| `title` | text | 논문 제목 |
| `authors` | text[] | 저자 목록 |
| `doi` | text | DOI |
| `abstract` | text | Abstract |
| `status` | enum | `unread` \| `reading` \| `read` \| `key` \| `archived` |

#### `journals` — 투고 후보 저널 (프로젝트 공유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `project_id` | uuid → projects | 소속 프로젝트 |
| `name` | text | 저널 이름 |
| `impact_factor` | numeric | IF 지수 |
| `issn` | text | ISSN |
| `status` | enum | `considering` \| `shortlisted` \| `submitted` \| `accepted` \| `rejected` \| `withdrawn` |

#### `assets` — 연구 자산 라이브러리 (프로젝트 공유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `project_id` | uuid → projects | 소속 프로젝트 |
| `type` | enum | `quote` \| `figure` \| `table` \| `data` \| `reference` \| `note` |
| `title` | text | 자산 제목 |
| `content` | text | 인용구, 설명, 데이터 등 |
| `source` | text | 출처 |

#### `papers` — 트랙 집중 분석 논문
| 필드 | 타입 | 설명 |
|------|------|------|
| `track_id` | uuid → tracks | 소속 트랙 |
| `title` | text | 논문 제목 |
| `status` | enum | `unread` \| `reading` \| `read` \| `key` \| `archived` |
| `notes` | text | 분석 메모 |

#### `hypotheses` — 연구 가설 (트랙 고유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `track_id` | uuid → tracks | 소속 트랙 |
| `title` | text | 가설 제목 |
| `statement` | text | 가설 내용 |
| `rationale` | text | 근거 |
| `status` | enum | `draft` \| `active` \| `testing` \| `confirmed` \| `rejected` |

#### `drafts` — 초고 버전 (트랙 고유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `track_id` | uuid → tracks | 소속 트랙 |
| `journal_id` | uuid → journals | 투고 대상 저널 |
| `title` | text | 초고 제목 |
| `abstract` | text | Abstract |
| `body` | text | 본문 |
| `status` | enum | `outline` \| `drafting` \| `revising` \| `ready` \| `submitted` |
| `word_count` | integer | 단어 수 |

#### `figures` — 그림 및 데이터 (트랙 고유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `track_id` | uuid → tracks | 소속 트랙 |
| `draft_id` | uuid → drafts | 연결된 초고 |
| `type` | enum | `chart` \| `graph` \| `diagram` \| `table` \| `image` \| `other` |
| `status` | enum | `planned` \| `draft` \| `final` |

#### `reviews` — Red Team 피드백 (트랙 고유)
| 필드 | 타입 | 설명 |
|------|------|------|
| `draft_id` | uuid → drafts | 대상 초고 |
| `feedback` | text | 피드백 내용 |
| `severity` | enum | `minor` \| `major` \| `critical` |
| `category` | enum | `methodology` \| `clarity` \| `novelty` \| `structure` \| `data` \| `other` |
| `resolved` | boolean | 해결 여부 |

---

## 4. 모듈 파이프라인

논문 한 편은 7개 모듈을 순서대로 통과합니다.

```
M0 → M1 → M2 → M3 → M4 → M5 → M6
```

### M0. 주제 관리 (Research Theme Manager)

**목적:** 프로젝트와 트랙을 정의하고, 논문 읽기 목록을 관리합니다.

**주요 기능:**
- 프로젝트 생성 및 Research Intent 정의
- 트랙 생성 (병렬/순차 관계 설정 가능)
- 트랙별 논문 상태 추적 (`unread → reading → read → key`)
- 프로젝트 공유 참고문헌 관리 (`/reference-papers`)

**산출물:** 구조화된 연구 계획, 핵심 논문 목록

---

### M1. 저널 인텔리전스 (Journal Intelligence)

**목적:** 투고할 저널을 분석하고, 수락 가능성을 높이는 전략을 수립합니다.

**주요 기능:**
- 저널 후보 등록 및 Impact Factor 비교
- 투고 상태 추적 (`considering → shortlisted → submitted → accepted`)
- Scope 분석 및 투고 URL 관리

**데이터 범위:** 프로젝트 공유 (모든 트랙이 동일한 저널 풀 사용)

---

### M2. 자산 라이브러리 (Asset Library)

**목적:** 논문 작성에 재사용할 수 있는 자료를 체계적으로 저장합니다.

**자산 유형:**
| 유형 | 용도 |
|------|------|
| `quote` | 인용할 문장, 핵심 주장 |
| `figure` | 재사용 가능한 그림 |
| `table` | 데이터 테이블 |
| `data` | 실험 결과, 수치 데이터 |
| `reference` | 자주 인용할 참고문헌 정보 |
| `note` | 아이디어 메모 |

**데이터 범위:** 프로젝트 공유

---

### M3. 논증 설계 (Argument Architect)

**목적:** 연구의 핵심 가설과 논거를 정의하고 검증 상태를 추적합니다.

**가설 상태 흐름:**
```
draft → active → testing → confirmed
                         ↘ rejected
```

**데이터 범위:** 트랙 고유 (트랙마다 다른 가설 구조)

---

### M4. 초고 공장 (Draft Factory)

**목적:** 논문 초고를 버전 관리하고 완성도를 추적합니다.

**초고 상태 흐름:**
```
outline → drafting → revising → ready → submitted
```

**주요 기능:**
- 투고 저널 연결 (M1 연동)
- Abstract·본문 직접 작성
- 단어 수 추적

**데이터 범위:** 트랙 고유

---

### M5. 그림 & 데이터 (Figure & Data)

**목적:** 논문에 들어갈 그림과 데이터를 미리 계획하고 제작 상태를 관리합니다.

**그림 상태 흐름:**
```
planned → draft → final
```

**데이터 범위:** 트랙 고유 (특정 초고와 연결 가능)

---

### M6. 레드팀 & 제출 (Red Team & Submit)

**목적:** 가상의 까다로운 리뷰어 관점에서 논문을 비판하고, 약점을 보완합니다.

**피드백 분류:**
| 항목 | 옵션 |
|------|------|
| 심각도 | `minor` / `major` / `critical` |
| 카테고리 | `methodology` / `clarity` / `novelty` / `structure` / `data` / `other` |

**워크플로우:** 피드백 추가 → 수정 작업 → `resolved` 처리 → 제출 준비

**데이터 범위:** 트랙 고유 (특정 초고와 연결)

---

## 5. 워크플로우 가이드

### 신규 프로젝트 시작

1. **사이드바 상단** → "새 프로젝트" 클릭
2. 프로젝트 이름과 **Research Intent** 입력
   - Research Intent 예: _"딥러닝 기반 스펙트럼 분석이 기존 케모메트릭스 방법론보다 분류 성능이 우수한가?"_
3. 프로젝트가 생성되면 자동으로 해당 프로젝트로 전환됨

### 첫 트랙 만들기

1. M0 → **트랙** 메뉴 → "+ 새 트랙"
2. 트랙 이름, Research Intent, 색상 설정
3. 상위 트랙이 있다면 선택 후 병렬/순차 관계 지정

### 참고문헌 쌓기

1. M0 → **참고문헌** 메뉴 → "+ 논문 추가"
2. 제목, 저자, DOI, Abstract 입력
3. 읽으면서 상태 갱신: `unread → reading → read → key`
4. **핵심 논문(`key`)** 은 자산 라이브러리에 인용구로 추출하면 효율적

### 논문 작성 사이클 (트랙별 반복)

```
[M1] 저널 후보 3-5개 선정 (shortlisted)
      ↓
[M3] 핵심 가설 2-3개 정의 (active)
      ↓
[M5] 필요한 그림 미리 계획 (planned)
      ↓
[M4] 초고 아웃라인 작성 (outline → drafting)
      ↓
[M5] 그림 제작 (draft → final)
      ↓
[M4] 초고 완성 (revising → ready)
      ↓
[M6] Red Team 피드백 수집 및 반영
      ↓
[M4] 최종본 확정 (submitted)
      ↓
[M1] 저널 상태 업데이트 (submitted → accepted/rejected)
```

---

## 6. 기술 스택

| 계층 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 서버 로직 | Next.js Server Actions |
| 타입 | TypeScript (strict) |
| 인증 | @supabase/ssr |

### 파일 구조

```
paper-framework/
├── app/
│   ├── (app)/              # 메인 앱 레이아웃
│   │   ├── layout.tsx      # 프로젝트 데이터 fetch + Sidebar 주입
│   │   ├── dashboard/      # M0 대시보드
│   │   ├── tracks/         # M0 트랙 관리
│   │   ├── papers/         # M0 논문 분석
│   │   ├── reference-papers/ # M0 공유 참고문헌
│   │   ├── journal/        # M1 저널 인텔리전스
│   │   ├── assets/         # M2 자산 라이브러리
│   │   ├── architect/      # M3 논증 설계
│   │   ├── draft/          # M4 초고 공장
│   │   ├── figures/        # M5 그림 & 데이터
│   │   └── redteam/        # M6 레드팀
│   └── page.tsx            # 루트 리다이렉트
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # 네비게이션 + 프로젝트 선택기
│   │   └── project-selector.tsx # 프로젝트 드롭다운
│   ├── module0/            # 트랙, 논문, 프로젝트, 참고문헌 폼/다이얼로그
│   ├── module1/ ~ module6/ # 각 모듈 폼/다이얼로그
│   └── ui/
│       └── badge.tsx       # 상태 배지 컴포넌트
│
├── lib/
│   ├── types.ts            # 전체 도메인 타입 정의
│   ├── selected-project.ts # 쿠키 기반 선택 프로젝트 헬퍼
│   ├── actions/            # Server Actions (모듈별)
│   │   ├── projects.ts
│   │   ├── project-context.ts  # 선택 프로젝트 쿠키 설정
│   │   ├── reference-papers.ts
│   │   ├── tracks.ts
│   │   ├── papers.ts
│   │   ├── journals.ts
│   │   ├── assets.ts
│   │   ├── hypotheses.ts
│   │   ├── drafts.ts
│   │   ├── figures.ts
│   │   └── reviews.ts
│   └── supabase/
│       └── server.ts       # Supabase 클라이언트 (SSR)
│
└── supabase/
    ├── schema.sql          # 전체 스키마 (신규 설치)
    └── migration-v2.sql    # 기존 DB 마이그레이션
```

### 프로젝트 선택 메커니즘

선택된 프로젝트는 **쿠키**(`selected_project`)에 저장됩니다.

```
사용자가 드롭다운에서 프로젝트 선택
        ↓
setSelectedProject() Server Action → 쿠키 설정
        ↓
router.refresh() → 모든 Server Component 재렌더링
        ↓
각 페이지: getSelectedProjectId() → 쿠키에서 ID 읽기 → 해당 프로젝트 데이터 fetch
```

---

## 7. 시작하기

### 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 데이터베이스 설정

Supabase SQL Editor에서 `supabase/schema.sql` 전체 내용을 실행합니다.

기존 설치가 있다면 `supabase/migration-v2.sql`을 실행합니다.

### 개발 서버

```bash
npm run dev
# → http://localhost:3000
```

### 첫 실행 순서

1. 사이드바 상단 드롭다운 → **"+ 새 프로젝트"**
2. 프로젝트 이름과 Research Intent 입력 → 생성
3. **M0 → 트랙** → 첫 번째 연구 트랙 생성
4. **M0 → 참고문헌** → 관련 논문 추가 시작
5. **M1 → 저널** → 투고 후보 저널 등록

---

*PaperFactory v0.2 — Project-Track Hierarchy*
