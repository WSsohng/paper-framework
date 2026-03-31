'use server'

import { cookies } from 'next/headers'
import { COOKIE_KEY } from '@/lib/selected-project'

export async function setSelectedProject(projectId: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_KEY, projectId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
}
