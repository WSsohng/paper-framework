import { cookies } from 'next/headers'

export const COOKIE_KEY = 'selected_project'

export async function getSelectedProjectId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_KEY)?.value ?? null
}
