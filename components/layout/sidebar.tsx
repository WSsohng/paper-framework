'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProjectSelector } from './project-selector'
import { logout } from '@/lib/actions/site-auth'
import type { Project } from '@/lib/types'

type Module = {
  id: number
  shortLabel: string
  label: string
  href: string
  /** pathname prefix for active detection */
  matchPrefix: string
}

/** M0~M6 연구 파이프라인 */
const modules: Module[] = [
  { id: 0, shortLabel: 'M0', label: '주제 탐색',        href: '/reference-papers?view=discover', matchPrefix: '/reference-papers' },
  { id: 1, shortLabel: 'M1', label: '저널 인텔리전스',   href: '/journal',    matchPrefix: '/journal'    },
  { id: 2, shortLabel: 'M2', label: '자산 라이브러리',   href: '/assets',     matchPrefix: '/assets'     },
  { id: 3, shortLabel: 'M3', label: '논증 설계',         href: '/architect',  matchPrefix: '/architect'  },
  { id: 4, shortLabel: 'M4', label: '초고 공장',          href: '/draft',      matchPrefix: '/draft'      },
  { id: 5, shortLabel: 'M5', label: '그림 & 데이터',     href: '/figures',    matchPrefix: '/figures'    },
  { id: 6, shortLabel: 'M6', label: '레드팀',             href: '/redteam',   matchPrefix: '/redteam'    },
]

interface Props {
  projects: Project[]
  selectedProject: Project | null
}

export function Sidebar({ projects, selectedProject }: Props) {
  const pathname = usePathname()

  const isDashboard = pathname === '/dashboard'
  const isInsights  = pathname === '/insights'

  const isModuleActive = (mod: Module) =>
    pathname === mod.matchPrefix ||
    pathname.startsWith(mod.matchPrefix + '/') ||
    pathname.startsWith(mod.matchPrefix + '?')

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* 로고 */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4">
        <span className="text-base font-bold tracking-tight text-zinc-100">
          Academic<span className="text-indigo-400">Factory</span>
        </span>
      </div>

      {/* 프로젝트 선택기 */}
      <div className="shrink-0 border-b border-zinc-800 pt-3">
        <ProjectSelector projects={projects} selectedProject={selectedProject} />
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">

        {/* 대시보드 — 파이프라인 진입 전 총괄 뷰 */}
        <Link
          href="/dashboard"
          className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
            isDashboard
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
          }`}
        >
          <span className={`shrink-0 text-[11px] ${isDashboard ? 'text-indigo-400' : 'text-zinc-700'}`}>
            ◈
          </span>
          <span className="flex-1 truncate">대시보드</span>
          {isDashboard && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
        </Link>

        {/* 구분선 + 파이프라인 레이블 */}
        <div className="pt-2 pb-1 px-2.5">
          <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">
            연구 파이프라인
          </p>
        </div>

        {/* M0~M6 선형 흐름 */}
        {modules.map((mod) => {
          const active = isModuleActive(mod)
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={`group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
              }`}
            >
              <span
                className={`shrink-0 font-mono text-[10px] tabular-nums ${
                  active ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-500'
                }`}
              >
                {mod.shortLabel}
              </span>
              <span className="flex-1 truncate">{mod.label}</span>
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
            </Link>
          )
        })}

        {/* 트랙 — 파이프라인과 별개로 접근 가능 */}
        <div className="pt-2 pb-1 px-2.5">
          <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">
            관리
          </p>
        </div>
        <Link
          href="/tracks"
          className={`group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
            pathname.startsWith('/tracks')
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
          }`}
        >
          <span className={`shrink-0 text-[11px] ${pathname.startsWith('/tracks') ? 'text-indigo-400' : 'text-zinc-700 group-hover:text-zinc-500'}`}>
            ⊞
          </span>
          <span className="flex-1 truncate">트랙 관리</span>
          {pathname.startsWith('/tracks') && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
        </Link>

      </nav>

      {/* 푸터 */}
      <div className="shrink-0 border-t border-zinc-800 px-3 py-3 space-y-1">
        <Link
          href="/insights"
          className={`flex h-8 items-center gap-2 rounded-md px-2 text-xs transition-colors ${
            isInsights
              ? 'bg-zinc-800 text-zinc-200'
              : 'text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-400'
          }`}
        >
          <span className="text-indigo-500">✦</span>
          Framework Insights
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-400 transition-colors"
          >
            로그아웃
          </button>
        </form>
        <p className="px-2 text-[10px] text-zinc-800">paper-framework v0.2</p>
      </div>
    </aside>
  )
}
