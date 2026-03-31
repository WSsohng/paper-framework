'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProjectSelector } from './project-selector'
import type { Project } from '@/lib/types'

type NavItem = { label: string; href: string }

type Module = {
  id: number
  shortLabel: string
  label: string
  href: string
  sub?: NavItem[]
}

const modules: Module[] = [
  {
    id: 0,
    shortLabel: 'M0',
    label: '주제 관리',
    href: '/dashboard',
    sub: [
      { label: '대시보드',   href: '/dashboard' },
      { label: '트랙',       href: '/tracks' },
      { label: '논문',       href: '/papers' },
      { label: '참고문헌',   href: '/reference-papers' },
    ],
  },
  { id: 1, shortLabel: 'M1', label: '저널 인텔리전스', href: '/journal' },
  { id: 2, shortLabel: 'M2', label: '자산 라이브러리',  href: '/assets' },
  { id: 3, shortLabel: 'M3', label: '논증 설계',        href: '/architect' },
  { id: 4, shortLabel: 'M4', label: '초고 공장',         href: '/draft' },
  { id: 5, shortLabel: 'M5', label: '그림 & 데이터',    href: '/figures' },
  { id: 6, shortLabel: 'M6', label: '레드팀',            href: '/redteam' },
]

interface Props {
  projects: Project[]
  selectedProject: Project | null
}

export function Sidebar({ projects, selectedProject }: Props) {
  const pathname = usePathname()

  const isModuleActive = (mod: Module) =>
    pathname === mod.href ||
    pathname.startsWith(mod.href + '/') ||
    (mod.sub?.some((s) => pathname === s.href || pathname.startsWith(s.href + '/')) ?? false)

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
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {modules.map((mod) => {
          const moduleActive = isModuleActive(mod)

          return (
            <div key={mod.id} className="mb-0.5">
              <Link
                href={mod.href}
                className={`group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
                  moduleActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-[10px] tabular-nums ${
                    moduleActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-500'
                  }`}
                >
                  {mod.shortLabel}
                </span>
                <span className="flex-1 truncate">{mod.label}</span>
                {moduleActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                )}
              </Link>

              {mod.sub && moduleActive && (
                <div className="ml-2 mt-0.5 border-l border-zinc-800 pl-3 pb-1">
                  {mod.sub.map((item) => {
                    const subActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex h-7 items-center rounded-md px-2 text-xs transition-all duration-100 ${
                          subActive
                            ? 'text-zinc-100 bg-zinc-800/60'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                        }`}
                      >
                        {subActive && (
                          <span className="mr-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-500" />
                        )}
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* 푸터 */}
      <div className="shrink-0 border-t border-zinc-800 px-4 py-3">
        <p className="text-xs text-zinc-700">paper-framework v0.2</p>
      </div>
    </aside>
  )
}
