import Link from 'next/link'
import { getDashboardStats } from '@/lib/actions/papers'
import { getTracks } from '@/lib/actions/tracks'
import { getProject } from '@/lib/actions/projects'
import { getSelectedProjectId } from '@/lib/selected-project'
import { TrackStatusBadge, ProjectStatusBadge } from '@/components/ui/badge'
import { ProjectDialog } from '@/components/module0/project-dialog'

export const metadata = { title: 'Dashboard — Academic Factory' }

export default async function DashboardPage() {
  const selectedProjectId = await getSelectedProjectId()

  if (!selectedProjectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <p className="text-4xl">🔬</p>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">프로젝트를 선택하세요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            왼쪽 사이드바에서 프로젝트를 선택하거나 새 프로젝트를 만들어 시작하세요.
          </p>
        </div>
        <ProjectDialog
          trigger={
            <button className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 새 프로젝트 만들기
            </button>
          }
        />
      </div>
    )
  }

  const [project, stats, tracks] = await Promise.all([
    getProject(selectedProjectId),
    getDashboardStats(selectedProjectId),
    getTracks(selectedProjectId),
  ])

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const activeTracks  = tracks.filter((t) => t.status === 'active')
  const pausedTracks  = tracks.filter((t) => t.status === 'paused')
  const rootTracks    = tracks.filter((t) => !t.parent_track_id)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 프로젝트 헤더 */}
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-zinc-100">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.research_intent && (
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">{project.research_intent}</p>
            )}
          </div>
          <ProjectDialog
            project={project}
            trigger={
              <button className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                편집
              </button>
            }
          />
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '전체 트랙',   value: stats.total_tracks,  sub: `${stats.active_tracks}개 활성` },
            { label: '트랙 논문',   value: stats.total_papers,  sub: `${stats.unread_papers}편 미읽음` },
            { label: '핵심 논문',   value: stats.key_papers,    sub: '핵심 읽기 지정' },
            { label: '일시정지',    value: pausedTracks.length, sub: '재개 대기 중' },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-zinc-100">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-600">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* 트랙 현황 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">연구 트랙</h2>
            <Link
              href="/tracks"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              전체 보기 →
            </Link>
          </div>

          {tracks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 py-12 text-center">
              <p className="text-sm text-zinc-600">이 프로젝트에 트랙이 없습니다.</p>
              <Link
                href="/tracks"
                className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300"
              >
                첫 번째 트랙 만들기 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeTracks.slice(0, 6).map((track) => (
                <Link
                  key={track.id}
                  href={`/tracks/${track.id}`}
                  className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
                >
                  <span
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
                        {track.name}
                      </p>
                      {track.parent_track_id && (
                        <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {track.relation_type === 'sequential' ? '후속' : '병렬'}
                        </span>
                      )}
                    </div>
                    {track.research_intent && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">
                        {track.research_intent}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <TrackStatusBadge status={track.status} />
                      <span className="text-xs text-zinc-600">
                        {track.paper_count ?? 0} papers
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 트랙 구조 미리보기 */}
          {rootTracks.length > 0 && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="mb-2 text-xs font-medium text-zinc-500">트랙 구조</p>
              <div className="space-y-1.5">
                {rootTracks.map((root) => {
                  const children = tracks.filter((t) => t.parent_track_id === root.id)
                  return (
                    <div key={root.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: root.color }}
                        />
                        <span className="text-xs text-zinc-400">{root.name}</span>
                      </div>
                      {children.map((child) => (
                        <div key={child.id} className="ml-4 mt-1 flex items-center gap-2">
                          <span className="text-zinc-700">└</span>
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: child.color }}
                          />
                          <span className="text-xs text-zinc-500">{child.name}</span>
                          <span className="text-[10px] text-zinc-700">
                            ({child.relation_type === 'sequential' ? '후속 연구' : '병렬 진행'})
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 모듈 파이프라인 */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">모듈 파이프라인</h2>
          <div className="grid grid-cols-7 gap-2">
            {[
              { id: 0, label: '주제\n관리',       href: '/dashboard' },
              { id: 1, label: '저널\n인텔리전스', href: '/journal' },
              { id: 2, label: '자산\n라이브러리', href: '/assets' },
              { id: 3, label: '논증\n설계',        href: '/architect' },
              { id: 4, label: '초고\n공장',        href: '/draft' },
              { id: 5, label: '그림\n& 데이터',   href: '/figures' },
              { id: 6, label: '레드팀\n& 제출',    href: '/redteam' },
            ].map((mod, i) => (
              <Link key={mod.id} href={mod.href} className="group relative">
                {i > 0 && (
                  <div className="absolute top-4 -left-1 h-px w-2 bg-zinc-800" />
                )}
                <div className="rounded-lg border border-indigo-800 bg-indigo-950 px-2 py-3 text-center transition-colors group-hover:border-indigo-600 group-hover:bg-indigo-900">
                  <p className="text-[10px] font-bold text-indigo-400">M{mod.id}</p>
                  <p className="mt-1 whitespace-pre-line text-[10px] leading-tight text-zinc-300">
                    {mod.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
