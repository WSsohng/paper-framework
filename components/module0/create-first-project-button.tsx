'use client'

/**
 * 대시보드 빈 상태에서 사용하는 첫 프로젝트 생성 버튼.
 * 생성 직후 자동으로 해당 프로젝트를 선택해 대시보드로 전환한다.
 */

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectDialog } from '@/components/module0/project-dialog'
import { setSelectedProject } from '@/lib/actions/project-context'
import type { Project } from '@/lib/types'

export function CreateFirstProjectButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSuccess(project: Project) {
    startTransition(async () => {
      await setSelectedProject(project.id)
      router.refresh()
    })
  }

  return (
    <ProjectDialog
      onSuccess={handleSuccess}
      trigger={
        <button
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
        >
          {isPending ? '이동 중…' : '+ 새 프로젝트 만들기'}
        </button>
      }
    />
  )
}
