import Link from 'next/link'
import { getProjects } from '@/lib/actions/projects'
import { ArchivedProjectList } from './archived-list'

export default async function ArchivedProjectsPage() {
  const archived = await getProjects({ status: 'archived' })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← 대시보드
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-100">보관함</h1>
        <p className="mt-1 text-xs text-zinc-500">
          보관된 프로젝트 {archived.length}개. 복구하면 사이드바 셀렉터에 다시 나타나고, 영구 삭제하면 트랙·논문·발굴 기록까지 모두 사라집니다.
        </p>
      </div>

      {archived.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">보관된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <ArchivedProjectList projects={archived} />
      )}
    </div>
  )
}
