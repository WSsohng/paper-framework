-- ============================================================
-- Migration v20 — M0 발굴 모드 + Novelty 검증 + 이전 기록 데이터 모델
-- ============================================================
-- 배경:
--   M0 (연구 주제 발굴) 모듈에 세 가지 기능을 추가하면서 데이터 모델 확장이 필요.
--
--   1) 후속 질문 모드 시스템 ([심화]/[확장]/[새 각도])
--      - 라운드별 사용자 선택 모드를 영구 보존해야 "이전 기록" 탭에서
--        어떤 의도로 질문이 생성됐는지 재현 가능.
--      - 5개 후보 질문 + 사용자가 선택한 1개를 모두 보존 (현재는 선택 1개만).
--
--   2) Novelty 검증 (트랙 생성 직전 게이트)
--      - 사용자가 명시적으로 검증 버튼을 누르면 5차원 분석 결과를 트랙에 저장.
--      - 검증 결과는 트랙 description 보강 + 이후 회고 분석에 사용.
--
--   3) 이전 기록 탭 (트랙별 발굴 흐름)
--      - 현재 discovery_rounds 는 project_id 와만 연결되어, 어떤 라운드가
--        어떤 트랙으로 귀결됐는지 추적 불가.
--      - track_id 컬럼 추가로 트랙별 발굴 흐름 조회 가능.
--      - 트랙 생성 시 그 시점까지의 track_id IS NULL 라운드를 일괄 마킹.
--      - 기존 데이터(track_id NULL 유지)는 "이전 기록 > 미분류" 그룹으로 표시.
--
-- 영향 범위:
--   - lib/actions/ai/research-questions.ts (mode 인자 + label 출력)
--   - lib/actions/discovery-rounds.ts (저장/조회 시그니처 확장)
--   - lib/actions/ai/topic-recommendations.ts (novelty 필드 제거)
--   - lib/actions/ai/novelty-check.ts (신규)
--   - components/module0/literature-discovery-panel.tsx (모드 UI + 탭)
--   - components/module0/discovery-history-tab.tsx (신규)
--   - components/module0/novelty-check-dialog.tsx (신규)
--
-- 안전 사항:
--   - 모든 ADD COLUMN IF NOT EXISTS (idempotent)
--   - 기존 행은 NULL/기본값으로 유지 (백필 불필요)
--   - track_id ON DELETE SET NULL (트랙 삭제 시 라운드는 보존, 미분류로 강등)
-- ============================================================

-- ── discovery_rounds 확장 ─────────────────────────────────

alter table discovery_rounds
  add column if not exists track_id            uuid    references tracks(id) on delete set null,
  add column if not exists question_candidates jsonb,
  add column if not exists mode                text,
  add column if not exists regenerate_history  jsonb;

comment on column discovery_rounds.track_id is
  '이 라운드가 귀결된 트랙. NULL = 아직 트랙 미생성(진행 중) 또는 v20 이전 레거시(미분류).';

comment on column discovery_rounds.question_candidates is
  'AI 가 생성한 5개 후보 질문 전체 (각 항목은 { question, label, angle, focus, domain, coverage_note }).';

comment on column discovery_rounds.mode is
  '후속 질문 생성 시 사용자가 선택한 모드. 첫 라운드는 NULL. 값: deepen | broaden | new_angle.';

comment on column discovery_rounds.regenerate_history is
  'Regenerate 회차별 후보 묶음 배열. 각 항목 { mode, candidates[], generated_at }. 마지막 회차가 question_candidates 와 동일.';

create index if not exists discovery_rounds_track_idx
  on discovery_rounds(track_id, created_at);

-- ── tracks 확장 ───────────────────────────────────────────

alter table tracks
  add column if not exists topic_candidates      jsonb,
  add column if not exists selected_topic_index  integer,
  add column if not exists novelty_check         jsonb;

comment on column tracks.topic_candidates is
  '트랙 생성 시 AI 가 추천한 주제 N개 전체 (TopicRecommendation[]).';

comment on column tracks.selected_topic_index is
  'topic_candidates 배열에서 사용자가 선택한 인덱스. 사용자가 직접 입력한 주제(custom)면 NULL.';

comment on column tracks.novelty_check is
  'Novelty 검증 결과. 사용자가 검증 버튼을 누른 경우만 채워짐. 구조: { similar_papers[], dimensions: { topic, methodology, intersection, perspective, extension } }.';
