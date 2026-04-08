-- ============================================================
-- Migration v13: 전체 테이블 RLS 활성화
-- ============================================================
-- 이 앱은 사이트 비밀번호 인증(anon key) 방식으로 운영됩니다.
-- Supabase 보안 권고에 따라 모든 테이블에 RLS를 활성화하고,
-- 기존 discovery_rounds / ai_usage_logs 패턴과 동일하게
-- "allow all" 정책을 적용합니다.

-- projects
alter table projects enable row level security;
create policy "allow_all_projects" on projects
  for all using (true) with check (true);

-- tracks
alter table tracks enable row level security;
create policy "allow_all_tracks" on tracks
  for all using (true) with check (true);

-- papers
alter table papers enable row level security;
create policy "allow_all_papers" on papers
  for all using (true) with check (true);

-- reference_papers
alter table reference_papers enable row level security;
create policy "allow_all_reference_papers" on reference_papers
  for all using (true) with check (true);

-- journals
alter table journals enable row level security;
create policy "allow_all_journals" on journals
  for all using (true) with check (true);

-- assets
alter table assets enable row level security;
create policy "allow_all_assets" on assets
  for all using (true) with check (true);

-- hypotheses
alter table hypotheses enable row level security;
create policy "allow_all_hypotheses" on hypotheses
  for all using (true) with check (true);

-- drafts
alter table drafts enable row level security;
create policy "allow_all_drafts" on drafts
  for all using (true) with check (true);

-- figures
alter table figures enable row level security;
create policy "allow_all_figures" on figures
  for all using (true) with check (true);

-- reviews
alter table reviews enable row level security;
create policy "allow_all_reviews" on reviews
  for all using (true) with check (true);
