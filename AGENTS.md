<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Opus Refactor Roadmap

대형 구조 리팩토링은 `docs/opus-refactor/roadmap.md` 에 단일 로드맵으로 정리되어 있습니다. 일상 기능 개발과 구분되는 5개 Phase(papers 통합, 프롬프트 빌더, 데이터 플로우, 비용 거버넌스, 모듈 자동화)로 구성되며 Opus 4.7 high 세션 전용입니다.

- 리팩토링 관련 작업을 시작하기 전에 `docs/opus-refactor/README.md` → `roadmap.md` 순서로 확인
- 각 Phase는 `refactor/phase-N-xxx` 브랜치에서 작업, PR로 main에 병합
- Phase 끝마다 사용자 확정 게이트 필수
