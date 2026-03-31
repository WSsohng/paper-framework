import { Sidebar } from '@/components/layout/sidebar'
import { getProjects } from '@/lib/actions/projects'
import { getSelectedProjectId } from '@/lib/selected-project'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [projects, selectedProjectId] = await Promise.all([
    getProjects(),
    getSelectedProjectId(),
  ])

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null

  return (
    <div className="flex h-full">
      <Sidebar projects={projects} selectedProject={selectedProject} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
