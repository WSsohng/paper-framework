-- ============================================================
-- Migration v4: Asset 출처 연결 + 논문 섹션 지정
-- ============================================================
-- Run this in Supabase SQL Editor ONCE.

-- assets: 참고문헌 출처 연결 + 논문 섹션
alter table assets
  add column if not exists reference_paper_id uuid
    references reference_papers(id) on delete set null,
  add column if not exists paper_section text
    check (paper_section in (
      'intro',          -- 서론
      'methods',        -- 실험방법
      'results',        -- 결과
      'discussion',     -- 토론·고찰
      'conclusion',     -- 결론
      'supplementary'   -- 보충 자료
    ));

create index if not exists assets_reference_paper_id_idx on assets(reference_paper_id);
create index if not exists assets_paper_section_idx       on assets(paper_section);

comment on column assets.reference_paper_id is
  '이 자산이 인용/추출된 참고문헌 (reference_papers.id)';

comment on column assets.paper_section is
  '이 자산을 사용할 논문 섹션 — AI 초고 생성 시 컨텍스트로 활용';
