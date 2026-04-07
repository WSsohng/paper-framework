'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * 브라우저에서 F5 / Ctrl+R 새로고침 감지 시 대시보드로 이동.
 * 일반 링크 클릭이나 직접 URL 입력은 영향받지 않음.
 */
export function ReloadRedirect() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav?.type === 'reload' && pathname !== '/dashboard') {
      router.replace('/dashboard')
    }
  // 마운트 시 1회만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
