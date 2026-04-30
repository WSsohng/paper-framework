'use server'

import { cookies } from 'next/headers'
import { COOKIE_KEY } from '@/lib/selected-project'

export async function setSelectedProject(projectId: string | null): Promise<void> {
  const store = await cookies()
  if (projectId) {
    store.set(COOKIE_KEY, projectId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  } else {
    store.delete(COOKIE_KEY)
  }
}
