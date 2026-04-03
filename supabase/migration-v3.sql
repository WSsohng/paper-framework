-- ============================================================
-- Migration v3: 논문 티어링 + 트랙 실험 Flow
-- ============================================================
-- Run this in Supabase SQL Editor ONCE.

-- 1. reference_papers: 티어 필드 추가
alter table reference_papers
  add column if not exists tier integer check (tier in (1, 2, 3));

create index if not exists reference_papers_tier_idx on reference_papers(tier);

-- 2. tracks: 논문 작성 Flow 단계 + 실험 일정 + 컨텍스트 로그
alter table tracks
  add column if not exists current_stage text
    check (current_stage in (
      'hypothesis',        -- M3: 가설 수립
      'experiment_design', -- M3: 코어 실험 설계
      'experiment',        -- 인간: 실험 진행
      'validation',        -- M3: 실험값 검증·재설계
      'backup_design',     -- M3: 백업 실험 설계
      'backup_experiment', -- 인간: 백업 실험 진행
      'figures',           -- M5: Figure·Table 작성
      'draft',             -- M4: 논문 초고 작성
      'review',            -- M6: 레드팀·검수
      'submitted'          -- 제출 완료
    )),
  add column if not exists experiment_start_date date,
  add column if not exists target_submit_date    date,
  add column if not exists context_log           jsonb not null default '[]'::jsonb;

comment on column tracks.current_stage is
  '논문 작성 Flow 현재 단계 (M3→실험→M5→M4→M6)';

comment on column tracks.context_log is
  '트랙 내 핵심 결정사항 누적 (가설 선택, 실험값 요약, 방향 수정 등). AI 프롬프트 컨텍스트로 사용.';
