import { Sidebar } from '@/components/layout/sidebar'
import { getProjects } from '@/lib/actions/projects'
import { getTracks } from '@/lib/actions/tracks'
import { getSelectedProjectId } from '@/lib/selected-project'
import { getSelectedTrackId } from '@/lib/selected-track'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [projects, selectedProjectId, selectedTrackId] = await Promise.all([
    getProjects(),
    getSelectedProjectId(),
    getSelectedTrackId(),
  ])

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null
  const tracks = selectedProjectId ? await getTracks(selectedProjectId) : []

  // 선택된 트랙이 현재 프로젝트에 속하는지 검증
  const validTrackId = tracks.find((t) => t.id === selectedTrackId)?.id ?? null

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        tracks={tracks}
        selectedTrackId={validTrackId}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
