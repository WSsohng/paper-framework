'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProjectSelector } from './project-selector'
import { TrackPipelineSidebar } from './track-pipeline-sidebar'
import { logout } from '@/lib/actions/site-auth'
import type { Project, Track } from '@/lib/types'

type Module = {
  id: number
  shortLabel: string
  label: string
  href: string
  matchPrefix: string
}

const sharedModules: Module[] = [
  { id: 0, shortLabel: 'M0', label: '주제 탐색',      href: '/reference-papers?view=discover', matchPrefix: '/reference-papers' },
  { id: 1, shortLabel: 'M1', label: '저널 인텔리전스', href: '/journal',   matchPrefix: '/journal'   },
  { id: 2, shortLabel: 'M2', label: '자산 라이브러리', href: '/assets',    matchPrefix: '/assets'    },
]

const trackModules: Module[] = [
  { id: 3, shortLabel: 'M3', label: '논증 설계',    href: '/architect', matchPrefix: '/architect' },
  { id: 4, shortLabel: 'M4', label: '초고 공장',     href: '/draft',     matchPrefix: '/draft'     },
  { id: 5, shortLabel: 'M5', label: '그림 & 데이터', href: '/figures',   matchPrefix: '/figures'   },
  { id: 6, shortLabel: 'M6', label: '레드팀',        href: '/redteam',   matchPrefix: '/redteam'   },
]

interface Props {
  projects: Project[]
  selectedProject: Project | null
  tracks: Track[]
  selectedTrackId: string | null
}

export function Sidebar({ projects, selectedProject, tracks, selectedTrackId }: Props) {
  const pathname = usePathname()

  const isDashboard = pathname === '/dashboard'
  const isInsights  = pathname === '/insights'

  const isModuleActive = (mod: Module) =>
    pathname === mod.matchPrefix ||
    pathname.startsWith(mod.matchPrefix + '/') ||
    pathname.startsWith(mod.matchPrefix + '?')

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null
  const isTrackModule = trackModules.some((m) => isModuleActive(m))

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* 로고 */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4">
        <span className="text-base font-bold tracking-tight text-zinc-100">
          Paper<span className="text-indigo-400">Factory</span>
        </span>
      </div>

      {/* 프로젝트 선택기 */}
      <div className="shrink-0 border-b border-zinc-800 pt-3">
        <ProjectSelector projects={projects} selectedProject={selectedProject} />
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">

        {/* 대시보드 */}
        <Link
          href="/dashboard"
          className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
            isDashboard
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
          }`}
        >
          <span className={`shrink-0 text-[11px] ${isDashboard ? 'text-indigo-400' : 'text-zinc-700'}`}>◈</span>
          <span className="flex-1 truncate">대시보드</span>
          {isDashboard && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
        </Link>

        {/* 공유 레이어 M0–M2 */}
        <div className="pt-3 pb-1 px-2.5">
          <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">
            공유 레이어
          </p>
        </div>

        {sharedModules.map((mod) => {
          const active = isModuleActive(mod)
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
              }`}
            >
              <span className={`shrink-0 font-mono text-[10px] tabular-nums ${active ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                {mod.shortLabel}
              </span>
              <span className="flex-1 truncate text-[13px]">{mod.label}</span>
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
            </Link>
          )
        })}

        {/* ── 트랙 분기점 ── */}
        <div className="pt-3 pb-1 px-2.5 flex items-center justify-between">
          <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">
            트랙 선택
          </p>
          <Link
            href="/tracks"
            className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            관리
          </Link>
        </div>

        {/* 트랙 목록 — 클릭으로 선택 */}
        {selectedProject ? (
          <TrackPipelineSidebar tracks={tracks} selectedTrackId={selectedTrackId} />
        ) : (
          <p className="px-3 text-[10px] text-zinc-700">프로젝트를 먼저 선택하세요</p>
        )}

        {/* 트랙별 실행 M3–M6 */}
        <div className="pt-3 pb-1 px-2.5">
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">
              트랙별 실행
            </p>
            {/* 선택된 트랙 색상 표시 */}
            {selectedTrack && (
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedTrack.color }}
              />
            )}
          </div>
          {/* 선택된 트랙 이름 */}
          {selectedTrack && (
            <p className="mt-0.5 text-[9px] text-zinc-600 truncate leading-tight">
              {selectedTrack.name}
            </p>
          )}
        </div>

        {/* M3–M6: 트랙 선택 여부와 관계없이 항상 표시 */}
        {trackModules.map((mod) => {
          const active = isModuleActive(mod)
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : selectedTrack
                  ? 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-500'
              }`}
            >
              <span className={`shrink-0 font-mono text-[10px] tabular-nums ${
                active ? 'text-indigo-400' : selectedTrack ? 'text-zinc-600 group-hover:text-zinc-500' : 'text-zinc-800'
              }`}>
                {mod.shortLabel}
              </span>
              <span className="flex-1 truncate text-[13px]">{mod.label}</span>
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
              {/* 트랙 색상 표시 (M3–M6, 트랙 선택 시) */}
              {!active && selectedTrack && isTrackModule && (
                <span
                  className="shrink-0 h-1 w-1 rounded-full opacity-40"
                  style={{ backgroundColor: selectedTrack.color }}
                />
              )}
            </Link>
          )
        })}

        {/* 관리 섹션 */}
        <div className="pt-3 pb-1 px-2.5">
          <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase">관리</p>
        </div>
        <Link
          href="/tracks"
          className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-100 ${
            pathname === '/tracks'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
          }`}
        >
          <span className={`shrink-0 text-[11px] ${pathname === '/tracks' ? 'text-indigo-400' : 'text-zinc-700 group-hover:text-zinc-500'}`}>
            ⊞
          </span>
          <span className="flex-1 truncate text-[13px]">트랙 관리</span>
          {pathname === '/tracks' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
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
