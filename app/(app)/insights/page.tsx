import Link from 'next/link'
import { FRAMEWORK_MASTER_INSIGHT, MODULE_GUIDE_BASIS, MODULE_USAGE_GUIDE } from '@/lib/framework-philosophy'

export const metadata = { title: 'Framework Insights — PaperFactory' }

type ModuleStatus = 'live' | 'partial' | 'planned'

interface ModuleInsight {
  id:       number
  tag:      string
  name:     string
  href:     string
  status:   ModuleStatus
  insight:  string           // the key "why"
  howto:    string           // applied know-how
  ai:       string[]         // AI tools used / planned
  blank?:   string           // what's still missing / to be built
}

const modules: ModuleInsight[] = [
  {
    id: 0,
    tag: 'M0',
    name: '문헌 탐색 & 주제 설정',
    href: '/reference-papers?view=discover',
    status: 'live',
    insight:
      '연구자의 Intent가 먼저이고, AI가 질문·주제 옵션으로 프로토콜을 가속한다. 키워드가 아닌 전략적 질문으로 탐색하면 인사이트가 쌓인다.',
    howto:
      'Research Intent → AI가 전략적 질문 5개 생성 (인용 영향, 동향, 방법론 비교, 격차 탐색) → 연구자가 선택 + 인사이트 주석 입력 → Semantic Scholar로 실제 논문 검색 → 반복(후속 질문 생성) → 논문 pool이 커지면 AI가 투고 가능한 논문 주제 4개 추천 → 클릭 한 번으로 다음 모듈(Track)로 이행',
    ai: ['Claude (질문/주제 추론)', 'Semantic Scholar (논문 검색)', 'Gemini (최신 동향)'],
    blank: undefined,
  },
  {
    id: 1,
    tag: 'M1',
    name: '저널 인텔리전스',
    href: '/journal',
    status: 'live',
    insight:
      '저널 후보와 Fit 분석은 AI가 가속하고, 최종 목표 저널은 연구자가 고른다. 저널이 정해지면 방향·깊이·강조점이 정렬된다.',
    howto:
      'Research Intent → AI가 10개 저널 추천 (Fit Score 순) → 각 저널에 대한 전략적 인사이트 제공 (IF, 범위, 이 연구와의 적합도) → 사용자가 추가/삭제/수정 가능',
    ai: ['Claude / OpenAI (추천 & 인사이트 생성)'],
    blank: undefined,
  },
  {
    id: 2,
    tag: 'M2',
    name: '자산 라이브러리',
    href: '/assets',
    status: 'partial',
    insight:
      '증거는 공유 자본이다. 같은 프로젝트의 모든 트랙이 인용문, 데이터, 도표를 공유하면 트랙 간 시너지가 발생한다.',
    howto:
      '프로젝트 레벨 공유 에셋 관리 (인용문, 수치, 테이블, 데이터) → 어느 트랙에서든 참조 가능 → 에셋 간 연결 & 출처 추적',
    ai: ['계획됨 — 에셋 요약 & 관련 논문 자동 연결'],
    blank: 'AI 연결 기능 미구현 — 에셋 CRUD만 완성',
  },
  {
    id: 3,
    tag: 'M3',
    name: '논증 설계',
    href: '/architect',
    status: 'partial',
    insight:
      '글쓰기 전에 논리 구조를 설계한다. 반증 가능한 가설이 논문의 척추다. 가설이 명확하지 않으면 초고는 방향을 잃는다.',
    howto:
      '가설 수립 → 상태 추적 (draft → active → testing → confirmed/rejected) → 증거 맵핑 → 논리 체인 검증 → 초고와 연결',
    ai: ['계획됨 — 가설 일관성 검증, 반증 사례 자동 탐색'],
    blank: 'AI 논증 검증 미구현 — 가설 CRUD만 완성',
  },
  {
    id: 4,
    tag: 'M4',
    name: '초고 공장',
    href: '/draft',
    status: 'partial',
    insight:
      '글쓰기는 다시 쓰기다. 첫 초고부터 목표 저널 포맷으로 작성하면 수정 횟수가 줄어든다. 가설-도표-초고가 연결되어야 일관성이 유지된다.',
    howto:
      '초고를 저널 & 트랙 & 가설과 연결 → 단어 수 추적 → 섹션별 진행 상황 → 제출 준비 상태 판단',
    ai: ['계획됨 — 섹션별 AI 초안 지원, 저널 스타일 자동 포맷팅'],
    blank: 'AI 초안 지원 미구현 — 구조(CRUD) & 저널 연결만 완성',
  },
  {
    id: 5,
    tag: 'M5',
    name: '도표 & 데이터',
    href: '/figures',
    status: 'partial',
    insight:
      '도표가 논지를 전달한다. 뛰어난 논문은 도표만 봐도 기여점이 보인다. 글보다 도표를 먼저 계획하면 스토리가 명확해진다.',
    howto:
      '초고 섹션과 연결된 도표 계획 → 도표 타입 & 상태 관리 (계획 → 초안 → 완성) → 캡션 & 설명 작성',
    ai: ['계획됨 — 도표 설명 자동 생성, 데이터 시각화 제안'],
    blank: 'AI 도표 생성 미구현 — 도표 메타데이터 관리만 완성',
  },
  {
    id: 6,
    tag: 'M6',
    name: '레드팀 & 제출',
    href: '/redteam',
    status: 'partial',
    insight:
      '리뷰어보다 먼저 내 논문을 공격한다. 다양한 리뷰어 페르소나로 적대적 비판을 시뮬레이션하면 가장 취약한 지점이 드러나고, 해결하면 강해진다.',
    howto:
      '초고 선택 → AI 리뷰어 페르소나 (통계학자, 도메인 전문가, 방법론 비판가 등) → 심각도별 피드백 생성 → 해결 체크리스트',
    ai: ['계획됨 — 페르소나별 AI 리뷰 자동 생성, 저널별 리뷰 스타일 시뮬레이션'],
    blank: 'AI 리뷰 자동 생성 미구현 — 리뷰 CRUD & 해결 추적만 완성',
  },
]

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; dot: string }> = {
  live:    { label: '구현 완료', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/50', dot: 'bg-emerald-400' },
  partial: { label: '스켈레톤',  color: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',         dot: 'bg-zinc-500'   },
  planned: { label: '계획됨',    color: 'text-zinc-600 bg-zinc-900/60 border-zinc-800/50',         dot: 'bg-zinc-700'   },
}

// ── Page ─────────────────────────────────────────────────

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* ── Hero ──────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950 px-8 py-10">
        {/* background decoration */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.08),transparent_60%)]" />
        <div className="relative">
          <p className="mb-3 text-xs font-medium tracking-widest text-indigo-400 uppercase">
            Framework Philosophy
          </p>
          <h1 className="text-2xl font-bold text-zinc-100 leading-snug max-w-2xl">
            {FRAMEWORK_MASTER_INSIGHT.title}
          </h1>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-2xl">
            {FRAMEWORK_MASTER_INSIGHT.body}
          </p>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-2xl border-l-2 border-indigo-500/40 pl-4">
            {FRAMEWORK_MASTER_INSIGHT.split}
          </p>
          <p className="mt-2 text-xs text-indigo-400/90 font-medium">
            {FRAMEWORK_MASTER_INSIGHT.splitRatio}
          </p>

          {/* Protocol loop */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {FRAMEWORK_MASTER_INSIGHT.protocolSteps.map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-indigo-500/30 bg-indigo-900/20 px-3 py-1 text-xs text-indigo-300">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-xs text-zinc-700">→</span>
                )}
              </span>
            ))}
            <span className="text-xs text-indigo-500 ml-1">∞</span>
          </div>

          <p className="mt-4 font-mono text-[11px] text-zinc-600">
            {FRAMEWORK_MASTER_INSIGHT.principleEn}
          </p>
        </div>
      </div>

      {/* ── Pipeline Overview ─────────────────────────── */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-8 py-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {modules.map((mod, i) => {
            const cfg = STATUS_CONFIG[mod.status]
            return (
              <div key={mod.id} className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={mod.href}
                  className="group flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-700 transition-colors"
                >
                  <span className="text-[10px] font-bold font-mono text-zinc-500 group-hover:text-indigo-400 transition-colors">
                    {mod.tag}
                  </span>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors whitespace-nowrap">
                    {mod.name.split(' ')[0]}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                </Link>
                {i < modules.length - 1 && (
                  <span className="text-xs text-zinc-800">→</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex items-center gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 탭 네비게이션 ──────────────────────────────── */}
      <div className="flex gap-0 border-b border-zinc-800 px-8">
        <Link
          href="/insights"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            !tab
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          설계도
          <span className="ml-1.5 text-[10px] text-zinc-600">핵심 인사이트</span>
        </Link>
        <Link
          href="/insights?tab=guide"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'guide'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          사용 설명서
          <span className="ml-1.5 text-[10px] text-zinc-600">단계별 가이드</span>
        </Link>
        <Link
          href="/insights?tab=basis"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'basis'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          가이드 기준
          <span className="ml-1.5 text-[10px] text-zinc-600">AI 입력 정의</span>
        </Link>
      </div>

      {/* ── Module Cards (설계도 탭) ───────────────────── */}
      {(!tab || tab === 'design') && (
      <div className="flex-1 px-8 py-6 space-y-4">
        {modules.map((mod) => {
          const cfg = STATUS_CONFIG[mod.status]
          return (
            <div
              key={mod.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/80 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-indigo-400">{mod.tag}</span>
                  <h2 className="text-sm font-semibold text-zinc-200">{mod.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <Link
                    href={mod.href}
                    className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors"
                  >
                    열기 →
                  </Link>
                </div>
              </div>

              {/* Card body */}
              <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-3">
                {/* Key insight */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                    핵심 인사이트
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {mod.insight}
                  </p>
                </div>

                {/* Applied know-how */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                    적용 방법 (Know-how)
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {mod.howto}
                  </p>
                </div>

                {/* AI tools + blank */}
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                      AI 도구
                    </p>
                    <ul className="space-y-1">
                      {mod.ai.map((tool) => (
                        <li key={tool} className="flex items-start gap-1.5 text-xs text-zinc-500">
                          <span className="mt-0.5 text-indigo-500">✦</span>
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {mod.blank && (
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
                      <p className="text-[10px] font-semibold text-zinc-700 uppercase mb-1">미구현</p>
                      <p className="text-xs text-zinc-600 leading-snug">{mod.blank}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

      </div>
      )}

      {/* ── 사용 설명서 탭 ─────────────────────────────── */}
      {tab === 'guide' && (
        <div className="flex-1 px-8 py-6 space-y-3">
          <div className="mb-5">
            <p className="text-sm text-zinc-400 leading-relaxed">
              각 모듈에서 <strong className="text-zinc-200">무엇을</strong>, <strong className="text-zinc-200">어떤 순서로</strong>,{' '}
              <strong className="text-zinc-200">누가(AI·연구자)</strong> 하는지 단계별로 정의합니다.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              이 내용은 <code className="text-zinc-500">lib/framework-philosophy.ts</code> →{' '}
              <code className="text-zinc-500">MODULE_USAGE_GUIDE</code>에서 수정할 수 있으며, 수정 시 AI 가이드 동작에도 반영됩니다.
            </p>
          </div>

          {MODULE_USAGE_GUIDE.map((guide) => (
            <div
              key={guide.tag}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              {/* 모듈 헤더 */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/80 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-indigo-400">{guide.tag}</span>
                  <h2 className="text-sm font-semibold text-zinc-200">{guide.name}</h2>
                </div>
                <Link href={guide.href} className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors">
                  열기 →
                </Link>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* 시작 조건 */}
                <div className="flex items-start gap-3 rounded-lg bg-zinc-800/30 px-4 py-3">
                  <span className="shrink-0 mt-0.5 text-[10px] font-bold tracking-wider text-amber-500 uppercase">시작 조건</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{guide.trigger}</p>
                </div>

                {/* 단계별 흐름 */}
                <div>
                  <p className="mb-2.5 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">핵심 흐름</p>
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-mono text-zinc-500">
                            {i + 1}
                          </span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            step.by === 'ai'
                              ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/60'
                              : step.by === 'human'
                              ? 'bg-emerald-950/60 text-emerald-500 border border-emerald-800/60'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/60'
                          }`}>
                            {step.by === 'ai' ? 'AI' : step.by === 'human' ? '연구자' : 'AI+연구자'}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-zinc-300">{step.label}</span>
                          <p className="mt-0.5 text-xs text-zinc-500 leading-snug">{step.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* 완료 기준 */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">완료 기준</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{guide.done_when}</p>
                  </div>
                  {/* 실전 팁 */}
                  <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-amber-600 uppercase">실전 팁</p>
                    <ul className="space-y-1.5">
                      {guide.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-500 leading-snug">
                          <span className="shrink-0 mt-0.5 text-amber-700">·</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 가이드 기준 탭 ─────────────────────────────── */}
      {tab === 'basis' && (
        <div className="flex-1 px-8 py-6">
          <div className="mb-5">
            <p className="text-sm text-zinc-400 leading-relaxed">
              각 모듈에서 AI가 어떤 정보를 <strong className="text-zinc-200">기반으로</strong> 가이드를 제공하는지 정의합니다.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              이 정보는 <code className="text-zinc-500">lib/framework-philosophy.ts</code> →{' '}
              <code className="text-zinc-500">MODULE_GUIDE_BASIS</code>에서 수정합니다.
              프롬프트 수정 시 이 기준을 참고하세요.
            </p>
          </div>
          <div className="space-y-2">
            {MODULE_GUIDE_BASIS.map((m) => (
              <div
                key={m.tag}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
              >
                <div className="flex items-start gap-4 px-5 py-4">
                  <span className="shrink-0 font-mono text-xs font-bold text-indigo-400 mt-0.5 w-8">
                    {m.tag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-200">{m.module}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{m.goal}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.inputs.map((inp) => (
                        <span
                          key={inp}
                          className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-0.5 text-[11px] text-zinc-400"
                        >
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
